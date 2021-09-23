
# Multicam Media's vMix Multiviewer

![enter image description here](https://i.imgur.com/IVaJ8m7.jpg)


# Setup

Make a blank input (or with a background image) and start to add layers in a multiview-fashion.
Add a web-browser input and set it to layer 10 of the new input.

Web Browser URL:
~~http://multiview.multicam.media/~~

**SINCE vMix 24.0.0.60**

* TCP and Web API are now locked down by default with some enhanced security measures. These prevent a remote web page from accessing the API when opening that web page on the same machine as vMix.**

To work around this, save the html page locally (Ctrl + S), open it in chrome to get file:/// url and paste it into vmix.

## Parameters

You can change the input and update interval (default 150ms and input 1) by adding the following to the URL:
http://multicam.media/multiview?Input=2&Interval=500

## Example vMix Preset

https://multiview.multicam.media/vMixPreset/

## Example multiview-layouts (vMix 24 Only)

https://multiview.multicam.media/vMixLayouts/
