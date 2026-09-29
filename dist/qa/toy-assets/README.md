# Laboratory font

Gaegu Bold, Copyright 2018 The Gaegu Project Authors, SIL OFL 1.1.
Source: https://github.com/google/fonts/tree/main/ofl/gaegu

The production font is an existing character subset missing some laboratory Korean text.
`gaegu-lab-bold.woff` subsets the same official Gaegu Bold font to the characters used in the lab HTML, CSS and JavaScript. The same subset is also served at `dist/assets/fonts/gaegu-toys-bold.woff` under the separate `Gaegu Toys` family for the production toy names and action words; the existing main Gaegu subset is unchanged. The full license is in `Gaegu-OFL.txt`.

Generation: fontTools.subset with `Options.flavor = "woff"`, populate from the text of `dist/qa/*lab*.{html,css,js}`. Font source `Gaegu-Bold.ttf`, not a runtime external request.
