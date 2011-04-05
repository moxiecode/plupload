<%@page contentType="text/html" pageEncoding="UTF-8"%>

<%@page import="java.io.BufferedOutputStream"%>
<%@page import="java.io.File"%>
<%@page import="java.io.FileOutputStream"%>
<%@page import="java.io.IOException"%>
<%@page import="java.io.InputStream"%>
<%@page import="java.io.OutputStream"%>

<%@page import="javax.servlet.ServletException"%>
<%@page import="javax.servlet.ServletOutputStream"%>
<%@page import="javax.servlet.http.HttpServlet"%>
<%@page import="javax.servlet.http.HttpServletRequest"%>
<%@page import="javax.servlet.http.HttpServletResponse"%>

<%@page import="org.apache.commons.fileupload.FileItemIterator"%>
<%@page import="org.apache.commons.fileupload.FileItemStream"%>
<%@page import="org.apache.commons.fileupload.servlet.ServletFileUpload"%>
<%@page import="org.apache.commons.fileupload.util.Streams"%>

<%!
  /*
   * This code was originally written by Shad Aumann (http://blog.shadit.com/2010/10/28/java-servlet-plupload/)
   * and modified for the purposes of this project
  */

  private void saveUploadFile(InputStream input, FileItemStream item, File parentFolder) throws IOException {
    File localFile = new File(parentFolder, item.getName());
    BufferedOutputStream output = new BufferedOutputStream(new FileOutputStream(localFile));

    streamCopy(input, output);

    input.close();
    output.flush();
    output.close();
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
%>

<%!// Change this to the directory you want files to land in
  private final String UPLOAD_DIR = System.getProperty("java.io.tmpdir");
  private final String RESP_SUCCESS = "{\"jsonrpc\" : \"2.0\", \"result\" : null, \"id\" : \"id\"}";
  private final String RESP_ERROR = "{\"jsonrpc\" : \"2.0\", \"error\" : {\"code\": 101, \"message\": \"Failed to open input stream.\"}, \"id\" : \"id\"}";
%>

<%
    response.setContentType("text/html;charset=UTF-8");
    File parentFolder = new File(UPLOAD_DIR);
    if (request.getMethod().equals("POST")) {

      String responseString = RESP_SUCCESS;
      boolean isMultipart = ServletFileUpload.isMultipartContent(request);

      if (isMultipart) {
        ServletFileUpload upload = new ServletFileUpload();

        try {
          FileItemIterator iter = upload.getItemIterator(request);
          while (iter.hasNext()) {
            FileItemStream item = iter.next();
            String name = item.getFieldName();
            InputStream input = item.openStream();

            // Handle a form field.
            if (item.isFormField()) {
              System.out.println("name=" + name + ", value=" + Streams.asString(input));
            } // Handle a multi-part MIME encoded file.
            else {
              saveUploadFile(input, item, parentFolder);
            }
          }
        } catch (Exception e) {
          responseString = RESP_ERROR;
          e.printStackTrace();
        }
      } // Not a multi-part MIME request.
      else {
        responseString = RESP_ERROR;
      }

      response.setContentType("application/json");
      byte[] responseBytes = responseString.getBytes();
      response.setContentLength(responseBytes.length);
      ServletOutputStream output = response.getOutputStream();
      output.write(responseBytes);
      output.flush();
    }
%>
