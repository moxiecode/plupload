<%@page import="
  java.io.IOException,
  java.io.PrintWriter,
  java.io.File,java.io.FileReader,
  java.io.FileWriter,java.io.InputStream,
  java.io.OutputStream,java.io.FileInputStream,
  java.io.FileOutputStream,java.io.BufferedInputStream,
  javax.servlet.ServletException,
  javax.servlet.http.HttpServlet,
  javax.servlet.http.HttpServletRequest,
  javax.servlet.http.HttpServletResponse,
  java.security.MessageDigest,
  java.security.NoSuchAlgorithmException"%><%!
  /* Note: the client really dislikes extraneous whitespace in the response, so we won't give JSP a chance to output that */

  private void writeMeta(File file, String md5sum, int chunk, int chunks) {
    if (chunk < (chunks - 1)) {
      String upload_meta_data = "status=uploading&chunk=" + chunk + "&chunks=" + chunks + "&md5=" + md5sum;
      FileWriter writer = null;
      try {
        writer = new FileWriter(file);
        writer.write(upload_meta_data);
      } catch (IOException e) {
      } finally {
        if (writer != null) {
          try {
            writer.close();
          } catch (IOException e) {
          }
        }
      }
    } else {
      file.delete();
    }
  }

  public void streamCopy(InputStream is, OutputStream os) throws IOException {
    streamCopy(is, os, 8192);
  }

  public void streamCopy(InputStream is, OutputStream os, int chunkSize) throws IOException {
    byte[] buf = new byte[chunkSize];
    int bytesRead;
    while ((bytesRead = is.read(buf)) != -1) {
      os.write(buf, 0, bytesRead);
    }
  }

  private String cleanFilename(String filename) {
    if (filename != null) {
      int i = filename.lastIndexOf(".");
      if (i != -1) {
        filename = filename.substring(0, i) + filename.substring(i).toLowerCase();
      }
    }
    return filename;
  }

%><%!
  private final String UPLOAD_DIR = System.getProperty("java.io.tmpdir");

%><%
  File parentFolder = new File(UPLOAD_DIR);

  if (request.getMethod().equals("GET")) {
    response.setContentType("application/x-www-form-urlencoded");
    // probe
    String filename = cleanFilename(request.getParameter("name"));
    if (filename != null) {
      File file = new File(parentFolder, filename);
      try {
        if (file.exists()) {
          String metaname = filename + ".meta";
          File meta = new File(parentFolder, metaname);

          if (meta.exists()) { // Read and output contents from file if it exists
            byte[] buffer = new byte[(int) meta.length()];
            BufferedInputStream is = null;
            try {
                is = new BufferedInputStream(new FileInputStream(meta));
                is.read(buffer);
            } finally {
                if (is != null) {
                  try {
                    is.close();
                  } catch (IOException e) {}
                }
            }
            out.append(new String(buffer));

          } else {
            // meta file deleted
            out.append("status=finished");
          }
        } else {
          out.append("status=unknown");
        }
      } catch (Exception e) {
        try {
          out.append("status=unknown");
        } catch (IOException ex) {
        }
      }
    } else {
      try {
          out.append("status=unknown");
        } catch (IOException ex) {
        }
    }

  } else if (request.getMethod().equals("POST")) {

    response.setContentType("text/html;charset=UTF-8");
    // upload
    String filename = cleanFilename(request.getParameter("name"));
    byte[] md5chunk = request.getParameter("md5chunk").getBytes();
    String md5total = request.getParameter("md5total");
    int chunk = Integer.parseInt(request.getParameter("chunk"));
    int chunkSize = request.getContentLength();
    int chunks = Integer.parseInt(request.getParameter("chunks"));

    byte[] buffer = new byte[chunkSize];
    int nowRead = 0;
    int totalRead = 0;
    InputStream is = request.getInputStream();
    while (nowRead != -1 && chunkSize > totalRead) {
      nowRead = is.read(buffer, totalRead, chunkSize - totalRead);
      if (nowRead != -1) {
        totalRead += nowRead;
      }
    }

    try {
      MessageDigest md5 = MessageDigest.getInstance("MD5");
      md5.update(buffer);
      if (MessageDigest.isEqual(md5.digest(), md5chunk)) {
        throw new ServletException("Checksum error");
      }
    } catch (NoSuchAlgorithmException e) {
      throw new ServletException("md5sum generator not found");
    }

    File file = new File(parentFolder, filename);
    OutputStream os = new FileOutputStream(file, true);
    os.write(buffer, 0, totalRead);
    os.close();

    File metafile = new File(parentFolder, filename + ".meta");
    writeMeta(metafile, md5total, chunk, chunks);

    out.append("uploaded");
  }
%>