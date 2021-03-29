<?php
#!! IMPORTANT: 
#!! this file is just an example, it doesn't incorporate any security checks and 
#!! is not recommended to be used in production environment as it is. Be sure to 
#!! revise it and customize to your needs.
die("Make sure that you enable some form of authentication before removing this line.");

require_once("handler-php/PluploadHandler.php");

$ph = new PluploadHandler(array(
	'target_dir' => 'uploads/',
	'allow_extensions' => 'jpg,jpeg,png'
));

$ph->sendNoCacheHeaders();
$ph->sendCORSHeaders();

if ($result = $ph->handleUpload()) {
	die(json_encode(array(
		'OK' => 1,
		'info' => $result
	)));
} else {
	die(json_encode(array(
		'OK' => 0,
		'error' => array(
			'code' => $ph->getErrorCode(),
			'message' => $ph->getErrorMessage()
		)
	)));
}