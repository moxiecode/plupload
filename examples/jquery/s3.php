<?php 
/* 
In order to upload files to S3 using Flash runtime, one should start by placing crossdomain.xml into the bucket.
crossdomain.xml can be as simple as this:

<?xml version="1.0"?>
<!DOCTYPE cross-domain-policy SYSTEM "http://www.macromedia.com/xml/dtds/cross-domain-policy.dtd">
<cross-domain-policy>
<allow-access-from domain="*" secure="false" />
</cross-domain-policy>

In our tests SilverLight didn't require anything special and worked with this configuration just fine. It may fail back
to the same crossdomain.xml as last resort.

!!!Important!!! Plupload UI Widget here, is used only for demo purposes and is not required for uploading to S3.
*/

// important variables that will be used throughout this example
$bucket = 'BUCKET';
$region = "REGION"; //S3 region e.g. eu-west-1

// these can be found on your Account page, under Security Credentials > Access Keys
$accessKeyId = 'ACCESS_KEY_ID';
$secret = 'SECRET_ACCESS_KEY';

// prepare policy
$policy = base64_encode(json_encode(array(
	// ISO 8601 - date('c'); generates uncompatible date, so better do it manually
	'expiration' => date('Y-m-d\TH:i:s.000\Z', strtotime('+1 day')),  
	'conditions' => array(
		array('bucket' => $bucket),
		array('acl' => 'public-read'),
		array('starts-with', '$key', ''),
		// for demo purposes we are accepting only images
		array('starts-with', '$Content-Type', 'image/'),
		// Plupload internally adds name field, so we need to mention it here
		array('starts-with', '$name', ''), 	
		// One more field to take into account: Filename - gets silently sent by FileReference.upload() in Flash
		// http://docs.amazonwebservices.com/AmazonS3/latest/dev/HTTPPOSTFlash.html
		array('starts-with', '$Filename', ''), 
	)
)));

// sign policy
$signature = base64_encode(hash_hmac('sha1', $policy, $secret, true));

?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" dir="ltr">
<head>
<meta http-equiv="content-type" content="text/html; charset=UTF-8"/>

<title>Plupload to Amazon S3 Example</title>

<link rel="stylesheet" href="//ajax.googleapis.com/ajax/libs/jqueryui/1.8.9/themes/base/jquery-ui.css" type="text/css" />
<script src="//ajax.googleapis.com/ajax/libs/jquery/1.9.0/jquery.min.js"></script>
<script src="//ajax.googleapis.com/ajax/libs/jqueryui/1.10.2/jquery-ui.min.js"></script>

<!-- Load plupload and all it's runtimes and finally the UI widget -->
<link rel="stylesheet" href="../../js/jquery.ui.plupload/css/jquery.ui.plupload.css" type="text/css" />


<!-- production -->
<script type="text/javascript" src="../../js/plupload.full.min.js"></script>
<script type="text/javascript" src="../../js/jquery.ui.plupload/jquery.ui.plupload.js"></script>

<!-- debug
<script type="text/javascript" src="../../js/moxie.js"></script>
<script type="text/javascript" src="../../js/plupload.dev.js"></script>
<script type="text/javascript" src="../../js/jquery.ui.plupload/jquery.ui.plupload.js"></script>
-->

</head>
<body style="font: 13px Verdana; background: #eee; color: #333">

<h1>Plupload to Amazon S3 Example</h1>

<div id="uploader">
    <p>Your browser doesn't have Flash, Silverlight or HTML5 support.</p>
</div>

<script type="text/javascript">
// Convert divs to queue widgets when the DOM is ready
$(function() {
	$("#uploader").plupload({
		runtimes : 'html5,flash,silverlight',
		/*
		 * Sometime S3 will redirect the bucker url 'http://<?php echo $bucket; ?>.s3.amazonaws.com/' to
		 * https://<?= $bucket ?>.{region}.amazonaws.com the header sent is a 307 and it will break pupload
		 */
		url : 'https://<?= $bucket ?>.<?= $region ?>.amazonaws.com/',
		
		multipart: true,
		multipart_params: {
			'key': '${filename}', // use filename as a key
			'Filename': '${filename}', // adding this to keep consistency across the runtimes
			'acl': 'public-read',
			'Content-Type': 'image/jpeg',
			'AWSAccessKeyId' : '<?php echo $accessKeyId; ?>',		
			'policy': '<?php echo $policy; ?>',
			'signature': '<?php echo $signature; ?>'
		},
		
		// !!!Important!!! 
		// this is not recommended with S3, since it will force Flash runtime into the mode, with no progress indication
		//resize : {width : 800, height : 600, quality : 60},  // Resize images on clientside, if possible 
		
		// optional, but better be specified directly
		file_data_name: 'file',

		filters : {
			// Maximum file size
			max_file_size : '10mb',
			// Specify what files to browse for
			mime_types: [
				{title : "Image files", extensions : "jpg,jpeg"}
			]
		},

		// Flash settings
		flash_swf_url : '../../js/Moxie.swf',

		// Silverlight settings
		silverlight_xap_url : '../../js/Moxie.xap'
	});
});
</script>

</body>
</html>
