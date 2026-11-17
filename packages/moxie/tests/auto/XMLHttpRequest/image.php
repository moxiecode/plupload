<?php

header("Access-Control-Allow-Origin: *");

$output = file_get_contents(dirname(__FILE__) . '/image.jpg');

if (ini_get('zlib.output_compression'))
	ini_set('zlib.output_compression', 'Off');  //for IE

header('Pragma: public');
header('Expires: 0');  // no cache
header('Cache-Control: must-revalidate, post-check=0, pre-check=0');//IE

header('Last-Modified: '.date('j/n/Y h:i A'));
header('Cache-Control: private',false);

//header("Content-type: application/force-download");
header("Content-Transfer-Encoding: binary");
header("Content-type: image/jpeg" );
header('Content-Disposition: attachment; filename="image.jpg"');
header('Content-Length: ' . strlen($output));
header('Connection: close');

echo $output;