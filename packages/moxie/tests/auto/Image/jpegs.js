;(function(exports) {
	var jpegs = {
		'00da154a-0107-11e4-8336-3377b25ece3d.jpg': {
			desc: '',
			path: 'Image/exif/00da154a-0107-11e4-8336-3377b25ece3d.jpg',
			expect: {
				TIFF: {
					Make: 'TCT',
					Orientation: 1
				},
				EXIF: {
					PixelXDimension: 2560,
					PixelYDimension: 1440,
					MeteringMode: 'CenterWeightedAverage',
					LightSource: 'Other',
					Flash: 'Flash fired',
					FNumber: 2.8
				}
			}
		},
		
		'20111119122131.jpg': {
			desc: '',
			path: 'Image/exif/20111119122131.jpg',
			expect: {
				TIFF: {
					Make: 'Motorola'
				},
				EXIF: {
					PixelXDimension: 1920,
					PixelYDimension: 2560,
					DateTimeOriginal: '2011:11:19 12:21:30'
				}
			}
		},

		'3a5140ea-44fd-11e2-8df2-55ebef1da60e.jpg': {
			desc: '',
			path: 'Image/exif/3a5140ea-44fd-11e2-8df2-55ebef1da60e.jpg',
			expect: {
				EXIF: {
					PixelXDimension: 3264,
					PixelYDimension: 2448,
					MeteringMode: 'Pattern',
					Flash: 'Flash did not fire, auto mode',
					FNumber: 2.4
				}
			}
		},
		
		'img_0647.jpg': {
			desc: "Doesn't resize, #1146",
			path: 'Image/exif/img_0647.jpg',
			expect: {
				TIFF: {
					Model: 'Canon EOS 1100D',
					Orientation: 1
				},
				EXIF: {
					PixelXDimension: 4272,
					PixelYDimension: 2848,
					MeteringMode: 'Pattern',
					Flash: 'Flash did not fire, compulsory flash mode',
					FNumber: 5.6
				}
			}
		},
		
		'19da5c1e-511e-11e4-98b8-477c078e31c6.jpg': {
			desc: "Doesn't resize, #1146",
			path: 'Image/exif/19da5c1e-511e-11e4-98b8-477c078e31c6.jpg',
			hasThumb: true
		},
		
		'IMG_2232.JPG': {
			desc: "Valid jpeg with embedded thumb.",
			path: 'Image/exif/IMG_2232.JPG',
			hasThumb: true
		}
	};


	var queue = [];

	o.each(jpegs, function(jpeg, name) {
		queue.push(function(cb) {
			var xhr = new XMLHttpRequest();
			xhr.responseType = 'blob';
			xhr.open('get', '../../' + jpeg.path);
			
			xhr.onload = function() {
				var fr = new FileReader();
				
				fr.onload = function() {
					jpeg.source = this.result;
					cb();
				};

				fr.onerror = function() {
					cb("File cannot be loaded.");
				};

				fr.readAsArrayBuffer(this.response);
			};

			xhr.onerror = function() {
				cb("File cannot be loaded.");
			};

			xhr.send();
		});
	});

	o.inParallel(queue, function(err) {
		if (err) {
			throw err;
		}
		onJPEGsLoaded(jpegs);
	});
}(this));