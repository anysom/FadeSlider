;(function(root, fadeSlider) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register fadeSlider as an anonymous module
        define(fadeSlider);
    } else if (typeof exports === 'object') {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like environments that support module.exports,
    	// like Node.
        module.exports = fadePager();
    } else {
        // Browser globals. Register fadeSlider on window
        root.FadeSlider = fadeSlider();
    }
})(this, function() {
  'use strict';

  /**
  * Markup:
  * <div class="fade-pager">
      <ul class="fade-pager__pages">
        <li class="fade-pager__page frontpage-presentation__page active">
          <img src="http://lorempixel.com/400/200/people/1" alt="alt text">
        </li>
        <li class="fade-pager__page frontpage-presentation__page">
          <img src="http://lorempixel.com/400/200/people/2" alt="alt text">
        </li>
      </ul>
      <ul class="fade-pager__indicators">
          <li class="fade-pager__indicator active"></li>
          <li class="fade-pager__indicator"></li>
      </ul>

      <button class="fade-pager__btn--prev">Prev</button>
      <button class="fade-pager__btn--next">next</button>
    </div>
  */

  // Load dependencies
  var throttle = require('lodash/function/throttle.js');
  var Hammer = require('hammerjs');

  /*******
  *
  * Options:
  *   -auto: (BOOLEAN) dictates wether the pages should change automatically. Defaults to false
  *   -startIndex: (INTEGER) the index of the first item to display. Defaults to 0.
  *   -interval: (INTEGER) the interval at which to change page if auto is set to true. Defaults to 5000.
  *
  */
  return function(elem) {
    var pages = elem.find('.fade-slider__page');
    var indicators = elem.find('.fade-slider__indicator');
    var hammerTime;
    var containerSize = 0;
    var currentIndex = 0;
    var self = this;
    var windowWidth;

    var dirProp = function(direction, hProp, vProp) {
      return (direction & Hammer.DIRECTION_HORIZONTAL) ? hProp : vProp;
    };


    var transformPage = function(page, transform) {
      page.css('transform', transform);
      page.css('mozTransform', transform);
      page.css('webkitTransform', transform);
    };

    var activateIndicator = function(index) {
      indicators.removeClass('active');
      $(indicators[index]).addClass('active');
    };


    var revalidateBLazy = throttle(function() {
      window.bLazy.revalidate();
    }, 400, {leading: false});

    /*
    * Responsible for showing the actual movement of items based on the panning
    */
    var show = function(showIndex, percent, animate) {
      //never go out of bounds in animation
      showIndex = Math.max(0, Math.min(showIndex, pages.length - 1));

      if (animate) {
        elem.addClass('animate');
      } else {
        elem.removeClass('animate');
      }

      //loop all pages and animate them
      var transform, pos, $page, scale, opacity;
      var scaleModifier = 0.25;
      for (var i = 0; i < pages.length; i++) {
        $page = $(pages[i]);

        //depending on the direction animate differently
        if (percent <= 0) {
          //animate all elements to the right of the current page horizontally
          if (i > showIndex || i === showIndex && animate) {
            //reset opacity
            $page.css('opacity', 1);
            pos = (containerSize / 100) * (((i - showIndex) * 100) + percent);
            transform = 'translate3d(' + pos + 'px, 0, 0)';
            transformPage($page, transform);
          }

          //fade out the currently active element
          if ((i === showIndex && !animate) || (i === showIndex - 1 && animate)) {
            opacity = (100 + (animate ? -100 : percent)) / 100;
            scale = Math.min((100 + scaleModifier * (animate ? -100 : percent)) / 100, 1);
            $page.css('opacity', opacity);
            transform = 'scale(' + scale + ')';
            transformPage($page, transform);
          }
        } else {
          //animate all elements to the right of the current page horizontally
          if (i >= showIndex) {
            //reset opacity
            $page.css('opacity', 1);
            pos = (containerSize / 100) * (((i - showIndex) * 100) + percent);
            transform = 'translate3d(' + pos + 'px, 0, 0)';
            transformPage($page, transform);
          }

          if (i === showIndex - 1) {
            opacity = (0 + (animate ? -100 : percent)) / 100;
            scale = Math.min((100 * (1 - scaleModifier) + scaleModifier * (animate ? -100 : percent)) / 100, 1);
            $page.css('opacity', opacity);
            transform = 'scale(' + scale + ')';
            transformPage($page, transform);
          }
        }
      }

      revalidateBLazy();
    };

    /*
    * Called on pan events. Determines the percentage of movement and direction.
    */
    var onPan = function(ev) {
      var delta = dirProp(Hammer.DIRECTION_HORIZONTAL, ev.deltaX, ev.deltaY);

      if (Math.abs(delta) < 20) {
        return;
      }

      var percent = (100 / containerSize) * delta;
      var animate = false;

      if (ev.type === 'panend' || ev.type === 'pancancel') {
        if (Math.abs(percent) > 20 && ev.type === 'panend') {
          currentIndex += (percent < 0) ? 1 : -1;

          currentIndex = Math.min(currentIndex, pages.length - 1);
          currentIndex = Math.max(currentIndex, 0);
        }
        percent = 0;
        animate = true;
      }

      show(currentIndex, percent, animate);
      activateIndicator(currentIndex);
    };

    /*
    * Initializes the HammerJS plugin
    */
    var initializeHammer = function() {
      hammerTime = new Hammer.Manager(elem[0]);
      hammerTime.add(new Hammer.Pan({ direction: Hammer.DIRECTION_HORIZONTAL, threshold: 10 }));
      hammerTime.on('panstart panmove panend pancancel', onPan);
    };

    /*
    * all pages need to have same width as the elem itself.
    */
    var initializeSize = function() {
      //only initialize size when the window resizes in the width
      if (windowWidth !== $(window).width()) {
        windowWidth = $(window).width();
        containerSize = elem.width();
        pages.width(containerSize);

        var padding = $(window).width() >= window.settings.layoutBreakpoint ? window.settings.gutter : window.settings.gutterSmall;
        var height = (containerSize - padding) * (380 / 560);
        //The height can never be taller than the max height. In that case the bottom of the image is cropped
        var maxHeight = $(window).height() - 300;
        height = Math.min(height, maxHeight);

        elem.find('.fade-slider__list, .fade-slider__page').height(height);


        //set initial horizontal translation
        var paneIndex, translate;
        for (paneIndex = 0; paneIndex < pages.length; paneIndex++) {
          translate = 'translate3d(' + (containerSize * paneIndex) + 'px, 0, 0)';
          transformPage($(pages[paneIndex]), translate);
        }
      }
    };

    /*
    * Initialize the instance of FadeSlider.
    * This is the starting point.
    */
    var initialize = function() {
      initializeSize();
      initializeHammer();

      elem.addClass('initialized');

      //hook up resize event to reinitialize the size of the pages.
      $(window).on('resize', throttle(initializeSize, 50, {leading: true}));

      //hook up click events to all pages
      pages.each(function() {
        var xStart = 0;
        var $this = $(this);
        var index = $this.index();

        //don't initiate goToIndex when dragging a page. Therefore check xStart agains x at the mouse up event.
        $this.on('mousedown', function(event) {
          xStart = event.clientX || 0;
        });

        $this.on('mouseup', function(event) {
          var diff = (event.clientX || 0) - xStart;
          diff = Math.abs(diff);

          //if the mouse has moved less than 10px goToIndex
          //also index has to be other than the current index
          if (diff < 10) {
            var nextIndex = index === currentIndex ? currentIndex - 1 : index;
            self.goToIndex(nextIndex);
          }
        });
      });

      //hook up click events to all indicators
      elem.find('.fade-slider__indicator').on('click', function() {
        var index = $(this).index();
        if (index !== currentIndex) {
          self.goToIndex(index);
        }
      });

      elem.find('.fade-slider__indicator').first().addClass('active');
    };



    initialize();


    /*
    * PUBLIC functions
    */

    this.goToIndex = function(index) {
      //if index is out of bounds, do nothing
      if (index < 0 || index >= pages.length) {
        return;
      }

      //don't do anything when clicking the currently active item
      var diff = currentIndex - index;
      var diffAbs = Math.abs(diff);
      var flips = 0;

      var flip = function() {
        //will make 1 page flip either left or right.
        var modifier = diff < 0 ? 1 : -1;
        currentIndex += modifier;
        show(currentIndex, 0, true);
        flips++;
        activateIndicator(currentIndex);
        if (flips < diffAbs) {
          elem.addClass('linear-ease');
          setTimeout(flip, 250);
        } else {
          setTimeout(function() {
            elem.removeClass('linear-ease');
            //window.bLazy.revalidate();
          }, 350);
        }
      };

      flip();
    };
  };
});
