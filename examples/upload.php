<?php

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