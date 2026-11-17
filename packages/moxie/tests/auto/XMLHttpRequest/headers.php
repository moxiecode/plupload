<?php 
/*
Required by setRequestHeader() tests
*/

$headers = getallheaders();

echo json_encode($headers);
exit;