<?php

session_start();

// start session
if (isset($_REQUEST["start"]) && isset($_REQUEST["name"])) {
	$_SESSION['fileName'] = $_REQUEST["name"];
	die(json_encode(array('OK' => 1)));
}

// file name not saved, client doesn't send along browser cookies
if (!isset($_SESSION['fileName']) || $_SESSION['fileName'] != $_REQUEST["name"]) {
	die(json_encode(array(
		'OK' => 0, 
		'info' => empty($_SESSION) ? "Session not started" : $_REQUEST["name"] . " not registered."
	)));
}

die(json_encode(array('OK' => 1)));