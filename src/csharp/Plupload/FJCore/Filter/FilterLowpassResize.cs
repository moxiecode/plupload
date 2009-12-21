/// Copyright (c) 2009 Jeffrey Powers for Occipital Open Source.
/// Under the MIT License, details: License.txt.

namespace FluxJpeg.Core.Filtering
{
    using System;

    internal class LowpassResize : Filter
    {
        protected override void ApplyFilter()
        {
            // get source image size
            int width = _sourceData[0].GetLength(0),
                height = _sourceData[0].GetLength(1);

            int channels = _sourceData.Length;

            // Estimate a good filter size for the gaussian.
            // Note that gaussian isn't an ideal bandpass filter
            //  so this is an experimentally determined quantity
            double std = (width / _newWidth) * 0.50;

            for(int i = 0; i < channels; i++)
            {
                GrayImage channel = new GrayImage(_sourceData[i]);

                channel = Convolution.Instance.GaussianConv(channel, std);

                _sourceData[i] = channel.ToByteArray2D();
            }

            // number of pixels to shift in the original image
            double xStep = (double)width / _newWidth,
                   yStep = (double)height / _newHeight;


            NNResize resizer = new NNResize();

             _destinationData = resizer.Apply(_sourceData, _newWidth, _newHeight);


        }
    }
}
