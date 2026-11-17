<?php

$post = $_POST;
$post['OK'] = 1;

if (!empty($_FILES)) {
	$file_field_name = key($_FILES);

	if (!$_FILES[$file_field_name]['error']) {
		$post[$file_field_name] = $_FILES[$file_field_name];
	}
}

echo json_encode($post);
