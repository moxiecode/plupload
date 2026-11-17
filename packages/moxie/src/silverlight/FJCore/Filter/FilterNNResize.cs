/// Copyright (c) 2008 Jeffrey Powers for Fluxcapacity Open Source.
/// Under the MIT License, details: License.txt.

namespace FluxJpeg.Core.Filtering
{
    using System;

    internal class NNResize : Filter
    {
        protected override void ApplyFilter()
        {
            // get source image size
            int width = _sourceData[0].GetLength(0),
                height = _sourceData[0].GetLength(1);

            // number of pixels to shift in the original image
            double xStep = (double)width / _newWidth,
                   yStep = (double)height / _newHeight;

            double sX = 0.5*xStep, sY = 0.5*yStep;
            int i_sY, i_sX;

            for (int y = 0; y < _newHeight; y++)
            {
                i_sY = (int)sY; sX = 0;
                
                UpdateProgress((double)y / _newHeight);

                for (int x = 0; x < _newWidth; x++)
                {
                    i_sX = (int)sX;

                    _destinationData[0][x, y] = _sourceData[0][i_sX, i_sY];

                    if (_color) {

                        _destinationData[1][x, y] = _sourceData[1][i_sX, i_sY];
                        _destinationData[2][x, y] = _sourceData[2][i_sX, i_sY];
                    }

                    sX += xStep;
                }
                sY += yStep;
            }
        }
    }
}
