import Component from '@ember/component';
import { set, computed } from '@ember/object';
import { htmlSafe } from '@ember/string';
import { isPresent, isNone } from '@ember/utils';
import { inject as service } from '@ember/service';

import Deformers from '../../mixins/deformers';
import MagicNumbers from '../../const/magic-numbers';

export default Component.extend(Deformers, {
    inputProcessor: service(),
    persistenceHandler: service(),
    rngeezus: service(),
    platformAnalyzer: service(),
    statusBar: service(),
    classNames: ['iza-computer'],

    // ------------------- ember hooks -------------------

    click() {
        this._setDomFocusToSelf();
    },

    keyDown(event) {
        this.inputProcessor.processKey(event);
    },

    didInsertElement() {
        this._super(...arguments);

        // inform input processor of markup
        set(this.inputProcessor, 'relevantMarkup', this.$()[0]);
        this._initCanvas();

        // add resize listener
        const scope = this;
        window.addEventListener('resize', function() {
            scope._setContainerSize();
            scope._doRedrawHack();
        })

        // get everything started
        this._setContainerSize();
        this._startRenderLoop();
        this._setDomFocusToSelf();
    },

    didRender() {
        this._super(...arguments);

        // store max chars per line
        const textAreaWidth = this.viewportMeasurements.width - (2 * this.textEdgeBuffer);
        const maxCharsPerLine = Math.floor(textAreaWidth / MagicNumbers.FONT_CHARACTER_WIDTH);
        set(this.inputProcessor, 'maxCharsPerLine', maxCharsPerLine);
    },

    init() {
        this._super(...arguments);

        const scope = this;
        this.inputProcessor.bgImageCallback = function() {
            scope._setBgImage();
        };
    },

    // ------------------- computed properties -------------------

    textEdgeBuffer: computed('viewportMeasurements.{width,height}', {
        get() {
            return Math.max(this.viewportMeasurements.width, this.viewportMeasurements.height) * 0.06;
        }
    }),

    visibleDisplayLines: computed('inputProcessor.allDisplayLines.[]', 'viewportMeasurements.height', 'textEdgeBuffer', {
        get() {
            const lineHeightInPixels = MagicNumbers.SPACE_BETWEEN_LINES + MagicNumbers.FONT_SIZE;
            const maxLineHeight = this.viewportMeasurements.height - (2 * this.textEdgeBuffer);
            const maxLines = Math.ceil(maxLineHeight / lineHeightInPixels);
            const returnSet = [];

            const allLinesWidthHandled = this._fitDisplayLinesInContainerWidth();
            const initIndex = allLinesWidthHandled.length >= maxLines ? allLinesWidthHandled.length - maxLines : 0;

            let yCounter = 0;
            for (let i = initIndex; i < allLinesWidthHandled.length; i++) {
                const currLine = allLinesWidthHandled[i];
                const currY = lineHeightInPixels * yCounter;

                // handle colorizing of each line
                let workingLine = currLine;
                let customColor = null;
                const colorizePrefix = MagicNumbers.COLORIZE_LINE_PREFIX;
                const colorCodeLength = MagicNumbers.COLORIZE_COLOR_LENGTH;
                const isColorizedLine = currLine.substr(0, colorizePrefix.length) === colorizePrefix;

                if (isColorizedLine) {
                    const extractColorIndex = colorizePrefix.length + colorCodeLength;
                    customColor = currLine.substr(colorizePrefix.length, colorCodeLength);
                    workingLine = currLine.substr(extractColorIndex);
                }

                yCounter++;

                returnSet.push({
                    text: workingLine,
                    x: this.textEdgeBuffer,
                    y: this.textEdgeBuffer + currY,
                    customColor});
            }

            return returnSet;
        }
    }),

    viewportMeasurements: computed('containerHeight', 'containerWidth', {
        get() {
            // make it a 4:3 ratio as big as possible in the viewport
            const outputRatio = 4 / 3;
            const currHeight = this.containerHeight;
            const currWidth = this.containerWidth > MagicNumbers.ABSOLUTE_MAX_VIEWPORT_WIDTH ?
                MagicNumbers.ABSOLUTE_MAX_VIEWPORT_WIDTH :
                this.containerWidth;
            const maxHeight = currHeight - (MagicNumbers.MIN_BORDER * 2);
            const maxWidth = currWidth - (MagicNumbers.MIN_BORDER * 2);
            const isWideViewport = maxWidth / maxHeight > outputRatio;

            let height;
            let width;
            let left;
            let top;

            if (isWideViewport) {
                height = maxHeight;
                width = outputRatio * height;
                top = 0;
            } else {
                width = maxWidth;
                height = maxWidth * (1 / outputRatio);
                top = (currHeight - height) / 2 - (MagicNumbers.MIN_BORDER * 1);
            }

            left = (this.containerWidth - width) / 2;

            return {left, top, width, height};
        }
    }),

    routeContainerStyle: computed('viewportMeasurements', {
        get() {
            const styleString = `height: ${this.viewportMeasurements.height}px; 
                width: ${this.viewportMeasurements.width}px; 
                left: ${this.viewportMeasurements.left}px;
                top: ${this.viewportMeasurements.top}px`;

            return htmlSafe(styleString);
        }
    }),

    canvasWidth: computed('viewportMeasurements.width', {
        get() {
            return this.viewportMeasurements.width;
        }
    }),

    canvasHeight: computed('viewportMeasurements.height', {
        get() {
            return this.viewportMeasurements.height;
        }
    }),

    bgImagePath:computed('inputProcessor.bgImage', {
        get() {
            return this.inputProcessor.bgImage || 'emptyScreen.jpg';
        }
    }),

    // ------------------- private functions -------------------

    _initCanvas() {
        const canvasSource = this.$('#source-canvas')[0];
        const ctx = canvasSource.getContext("2d");
        const canvasAltered = this.$('#altered-canvas')[0];
        const ctx2 = canvasAltered.getContext("2d");

        ctx.imageSmoothingEnabled = false;
        ctx.mozImageSmoothingEnabled = false;
        ctx.webkitImageSmoothingEnabled = false;
        ctx.msImageSmoothingEnabled = false;
        ctx2.imageSmoothingEnabled = false;
        ctx2.mozImageSmoothingEnabled = false;
        ctx2.webkitImageSmoothingEnabled = false;
        ctx2.msImageSmoothingEnabled = false;

        // store reference to ctx for render loop access
        set(this, 'ctx', ctx)
        set(this, 'ctx2', ctx2)

        // canvas to put interaction items into
        ctx.fillStyle = "blue";
        ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

        // canvas to put modified image onto
        ctx2.fillStyle = "rgba(0,0,0,0)";
    },

    _setContainerSize() {
        if (this.containerHeight === window.innerHeight &&
            this.containerWidth === window.innerWidth) {
                return;
        }

        set(this, 'containerHeight', window.innerHeight);
        set(this, 'containerWidth', window.innerWidth);
        
        this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
        this.ctx2.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

        this._setBgImage();
    },

    _doRedrawHack() {
        window.scrollTo(0, 0);        
        const tickleMe = document.getElementById("source-canvas");
        const vignette = document.getElementById("vignette");

        setTimeout(function() {
            tickleMe.click();
            tickleMe.style.zIndex = "1";
            vignette.style.zIndex = "2";
            tickleMe.style.display = "block";
        }, 740)
    },

    _setBgImage() {
        const scope = this;
        const imageObj = new Image();
        set(this, 'isLoadingSomething', true);

        // load BG image
        imageObj.onload = function() {
            set(scope, 'bgImageData', this);
            set(scope, 'isLoadingSomething', false);
        };

        imageObj.src = `assets/${this.bgImagePath}`;
    },

    _setDomFocusToSelf() {
        this.$().attr({ tabindex: 1 });
        this.$().focus();
        this._setContainerSize();
    },

    _startRenderLoop() {
        // cross platform animationFrame handling
        var myRequestAnimationFrame =  window.requestAnimationFrame ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame    ||
            window.oRequestAnimationFrame      ||
            window.msRequestAnimationFrame     ||
            function(callback) {
                window.setTimeout(callback, 10);
            };

        // store local context on window
        window.recursiveAnimationFunction = this.recursiveAnimationFunction;
        window.animationScope = this;
        window.requestAnimationFrame=myRequestAnimationFrame;

        // get loop started
        this.recursiveAnimationFunction();
    },

    _drawText(ctx) {
        const scopedContext = ctx;

        ctx.font = `${MagicNumbers.FONT_SIZE}px courier-std`;

        this.visibleDisplayLines.forEach((currLine) => {
            
            if (isPresent(currLine.customColor)) {
                scopedContext.fillStyle = this.inputProcessor._getIsKeyboardActive() ?
                    currLine.customColor : 
                    MagicNumbers.INACTIVE_COLORIZED_COLOR;
            } else {
                scopedContext.fillStyle = this.inputProcessor._getIsKeyboardActive() ?
                    MagicNumbers.DEFAULT_SCROLLED_COLOR :
                    MagicNumbers.INACTIVE_SCROLLED_COLOR;
            }

            scopedContext.fillText(currLine.text, currLine.x, currLine.y);
        });
    },
    
    _deform(ctx2) {
        if (!this.originalScreenBitmap) {
            return;
        }

        let deformedImage = this.originalScreenBitmap;

        // chain pixel modifications
        deformedImage = this.applyAllDeformers(deformedImage);

        // make new image for display using contents of deformed image data
        let newImageData = ctx2.createImageData(this.canvasWidth, this.canvasHeight);
        for (let i = 0; i < newImageData.data.length; i++) {
            newImageData.data[i] = deformedImage.data[i];
        }

        // draw deformed image
        ctx2.putImageData(newImageData, 0, 0);

        this._doDisplacementCounter();
        const largeDisplacement = this.rngeezus.getRandomValue('largeDisplacementPool');
        this._createDisplacement(ctx2, deformedImage, 5, this.displacementCounter + 2, 4);
        this._createDisplacement(ctx2, deformedImage, 4, this.displacementCounter + 1, largeDisplacement);
        this._createDisplacement(ctx2, deformedImage, 2, this.displacementCounter, 1);
    },

    _doDisplacementCounter() {

        if (isNone(this.displacementCounter)) {
            set(this, 'displacementCounter', 0);
        }

        if (this.displacementCounter > this.canvasHeight * 3) {
            set(this, 'displacementCounter', 0);
        }

        const travelPixelsPerCycle = 3;
        set(this, 'displacementCounter', this.displacementCounter + travelPixelsPerCycle);
    },

    _createDisplacement(ctx2, deformedImage, dHeight, offset, displacement) {

        // if offset is beyond scope of screen just return
        if (offset > this.canvasHeight) {
            return;
        }

        let newImageData1 = ctx2.createImageData(this.canvasWidth, dHeight);
        
        for (let i = 0; i < newImageData1.data.length; i++) {
            const deformedPixel = i + (offset * this.canvasWidth * 4);
            newImageData1.data[i] = deformedImage.data[deformedPixel];
        }

        ctx2.putImageData(newImageData1, displacement, offset);
    },

    _fitDisplayLinesInContainerWidth() {
        let modifiedLines = [];
        const allLines = this.inputProcessor.allDisplayLines;
        const maxCharsPerLine = this.inputProcessor.maxCharsPerLine;

        // prevent inifinite loop?
        if (maxCharsPerLine < MagicNumbers.MIN_USEABLE_COLUMNS) {
            return ['', 'Minimum screen', 'size requirement', 'not met.','  :('];
        }

        allLines.forEach((currLine) => {

            let undemarcatedLine;
            // remove current block demarcation if it's there in addition to custom color
            if (currLine.indexOf(this.inputProcessor.currentBlockDemarcation()) === 0) {
                undemarcatedLine = currLine.split(this.inputProcessor.currentBlockDemarcation())[1];
            }         

            const colorizePrefix = MagicNumbers.COLORIZE_LINE_PREFIX;
            const testLine = isPresent(undemarcatedLine) ? undemarcatedLine : currLine;
            const isColorizedLine = testLine.substr(0, colorizePrefix.length) === colorizePrefix;
            const extractColorIndex = colorizePrefix.length + MagicNumbers.COLORIZE_COLOR_LENGTH;
            let savedLineColor = '';
            let workingLine = currLine;

            // remove color tag
            if (isColorizedLine) {
                savedLineColor = testLine.substr(0, extractColorIndex);
                workingLine = testLine.substr(extractColorIndex);
            } else if (isPresent(undemarcatedLine)) {
                savedLineColor = currLine.substr(0, extractColorIndex);
                workingLine = undemarcatedLine;
            }

            if (workingLine.length > maxCharsPerLine) {
                // break line into chunks that fit in the width of the viewport
                let segments = [];
                let currLastSegment = workingLine;

                while(currLastSegment.length > maxCharsPerLine) {
                    // if there are no spaces it's either a graph or user wrote something with no spaces.
                    if (currLastSegment.indexOf(' ') === -1) {
                        const safeLine = currLastSegment.substring(0, maxCharsPerLine);
                        currLastSegment = currLastSegment.substring(maxCharsPerLine - 1);
                        segments.push(safeLine);
                        break;
                    }

                    // find space closest to maxChars
                    let lastSpace = currLastSegment.lastIndexOf(' ', maxCharsPerLine);

                    if (lastSpace === -1) {
                        // then it's a command that's longer than max chars
                        lastSpace = maxCharsPerLine;
                    }

                    const safeLine = currLastSegment.substring(0, lastSpace);
                    segments.push(safeLine);

                    // modify target string
                    const remainder = currLastSegment.substring(lastSpace);
                    const firstNonSpaceIndex = remainder.search(/\S|$/);
                    currLastSegment = remainder.substring(firstNonSpaceIndex);
                }

                // add orphan
                segments.push(currLastSegment);

                // if it's a colorized line, add colorizor to each line
                if (isColorizedLine || isPresent(undemarcatedLine)) {
                    segments = segments.map((currSubLine) => {
                        return savedLineColor.concat(currSubLine);
                    });
                }

                // add segments to return set
                modifiedLines = modifiedLines.concat(segments);
            } else {
                // just add the raw line
                modifiedLines.push(savedLineColor.concat(workingLine));
            }
        });

        return modifiedLines;
    },

    // ------------------- public functions -------------------

    recursiveAnimationFunction() {
        const scope = window.animationScope;
        const bgImage = scope.bgImageData;
        const ctx = scope.ctx;
        const ctx2 = scope.ctx2;

        if(isPresent(ctx) && isPresent(bgImage)) {
            const w = scope.canvasWidth;
            const h = scope.canvasHeight;
            ctx.drawImage(bgImage, 0, 0, w, h);
            scope._drawText(ctx);
            scope.statusBar.drawStatusBar(ctx, scope.viewportMeasurements);

            if (scope.platformAnalyzer.isGraphicsEnabled()) {
                scope._deform(ctx2);
    
                // store canvas image data for manipulation
                const imgData = ctx.getImageData(0, 0, scope.canvasWidth, scope.canvasHeight);
                set(scope, 'originalScreenBitmap', imgData);
            }
        }

        window.requestAnimationFrame(window.recursiveAnimationFunction);
    }
});
