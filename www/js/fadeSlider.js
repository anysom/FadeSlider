// Define throttle fallback function
var fallbackThrottle = function(func, wait) {
  var timer = null;

  return function() {
    var context = this,
        args = arguments;

    if(timer === null) {
      timer = setTimeout(function() {
        func.apply(context, args);
        timer = null;
      }, wait);
    }
  };
};

;(function(root, fadeSlider) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register fadeSlider as an anonymous module
        define(["lodash/throttle", "hammerjs"], fadeSlider);
    } else if (typeof exports === 'object') {
      // Node. Does not work with strict CommonJS, but
      // only CommonJS-like environments that support module.exports,
    	// like Node.
      var throttle = require('lodash/throttle');
      var hammer = require('hammerjs');
      module.exports = fadeSlider(throttle, hammer);
    } else {
      // Browser globals. Register fadeSlider on window
      var throttle = root._ !== undefined ? root._.throttle : null;
      root.FadeSlider = fadeSlider(throttle, root.Hammer);
    }
})(this, function(throttle, Hammer) {
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
  throttle = throttle || fallbackThrottle;

  /*******
  *
  * Options:
  *   -auto: (BOOLEAN) dictates wether the pages should change automatically. Defaults to false
  *   -startIndex: (INTEGER) the index of the first item to display. Defaults to 0.
  *   -interval: (INTEGER) the interval at which to change page if auto is set to true. Defaults to 5000.
  *
  */
  return function(elem, settings) {
    settings = settings || {};
    var pages = elem.querySelectorAll('.fade-slider__page');
    var indicators = elem.querySelectorAll('.fade-slider__indicator');
    var hammerTime;
    var containerSize = 0;
    var currentIndex = 0;
    var self = this;
    var windowWidth;

    var dirProp = function(direction, hProp, vProp) {
      return (direction & Hammer.DIRECTION_HORIZONTAL) ? hProp : vProp;
    };

    var getIndex = function(node) {
      //var children = node.parentNode.childNodes;
      for (var i = 0; i < pages.length; i++) {
        if (node === pages[i]) break;
      }
      return i;
    }

    var transformPage = function(page, transform) {
      page.style.transform = transform;
      page.style.mozTransform = transform;
      page.style.webkitTransform = transform;
    };

    var activateIndicator = function(index) {
      if (indicators.length > 0) {
        for(var i = 0; i < indicators.length; i++) {
          indicators[i].classList.remove('active');
        }
        indicators[index].classList.add('active');
      }
    };

    /*
    * Responsible for showing the actual movement of items based on the panning
    */
    var show = function(showIndex, percent, animate) {
      //never go out of bounds in animation
      showIndex = Math.max(0, Math.min(showIndex, pages.length - 1));

      if (animate) {
        elem.classList.add('animate');
      } else {
        elem.classList.remove('animate');
      }

      //loop all pages and animate them
      var transform, pos, page, scale, opacity;
      var scaleModifier = 0.25;
      for (var i = 0; i < pages.length; i++) {
        page = pages[i];

        //depending on the direction animate differently
        if (percent <= 0) {
          //animate all elements to the right of the current page horizontally
          if (i > showIndex || i === showIndex && animate) {
            //reset opacity
            page.style.opacity = 1;
            pos = (containerSize / 100) * (((i - showIndex) * 100) + percent);
            transform = 'translate3d(' + pos + 'px, 0, 0)';
            transformPage(page, transform);
          }

          //fade out the currently active element
          if ((i === showIndex && !animate) || (i === showIndex - 1 && animate)) {
            opacity = (100 + (animate ? -100 : percent)) / 100;
            scale = Math.min((100 + scaleModifier * (animate ? -100 : percent)) / 100, 1);
            page.style.opacity = opacity;
            transform = 'scale(' + scale + ')';
            transformPage(page, transform);
          }
        } else {
          //animate all elements to the right of the current page horizontally
          if (i >= showIndex) {
            //reset opacity
            page.style.opacity = 1;
            pos = (containerSize / 100) * (((i - showIndex) * 100) + percent);
            transform = 'translate3d(' + pos + 'px, 0, 0)';
            transformPage(page, transform);
          }

          if (i === showIndex - 1) {
            opacity = (0 + (animate ? -100 : percent)) / 100;
            scale = Math.min((100 * (1 - scaleModifier) + scaleModifier * (animate ? -100 : percent)) / 100, 1);
            page.style.opacity = opacity;
            transform = 'scale(' + scale + ')';
            transformPage(page, transform);
          }
        }
      }

      // if an onPan callback has been defined, invoke it now
      if (settings.onPan) {
        settings.onPan(showIndex, percent, animate);
      }
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
      hammerTime = new Hammer.Manager(elem);
      hammerTime.add(new Hammer.Pan({ direction: Hammer.DIRECTION_HORIZONTAL, threshold: 10 }));
      hammerTime.on('panstart panmove panend pancancel', onPan);
    };

    /*
    * all pages need to have same width as the elem itself.
    */
    var initializeSize = function() {
      //only initialize size when the window resizes in the width
      if (windowWidth !== window.innerWidth) {
        windowWidth = window.innerWidth;
        containerSize = elem.getBoundingClientRect().width;

        for(var i = 0; i < pages.length; i++) {
          pages[i].style.width = containerSize + 'px';
        }

        // TODO: Remove dependency upon layout breakpoints
        //var padding = $(window).width() >= window.settings.layoutBreakpoint ? window.settings.gutter : window.settings.gutterSmall;

        // TODO: Remove height and format restriction
        //var height = (containerSize - padding) * (380 / 560);
        //The height can never be taller than the max height. In that case the bottom of the image is cropped
        //var maxHeight = $(window).height() - 300;
        //height = Math.min(height, maxHeight);

        // Set the height of the page list to the height of the heighest page
        setTimeout(function () {
          var heighestHeight = 0;

          for(var i = 0; i < pages.length; i++) {
            heighestHeight = Math.max(heighestHeight, pages[i].getBoundingClientRect().height);
          }
          elem.querySelector('.fade-slider__list').style.height = heighestHeight;
        }, 1);

        //set initial horizontal translation
        var paneIndex, translate;
        for (paneIndex = 0; paneIndex < pages.length; paneIndex++) {
          translate = 'translate3d(' + (containerSize * paneIndex) + 'px, 0, 0)';
          transformPage(pages[paneIndex], translate);
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

      elem.classList.add('initialized');

      //hook up resize event to reinitialize the size of the pages.
      window.addEventListener('resize', throttle(initializeSize, 50, {leading: true}));

      //hook up click events to all pages

      for(var i = 0; i < pages.length; i++) {
        // I have to encapsulate the initialization in a function to not mess with scopes
        function initializePage(page) {
          var xStart = 0;
          var index = getIndex(page);

          //don't initiate goToIndex when dragging a page. Therefore check xStart agains x at the mouse up event.
          pages[i].addEventListener('mousedown', function(event) {
            xStart = event.clientX || 0;
          });

          pages[i].addEventListener('mouseup', function(event) {
            var diff = (event.clientX || 0) - xStart;
            diff = Math.abs(diff);

            //if the mouse has moved less than 10px goToIndex
            //also index has to be other than the current index
            if (diff < 10) {
              var nextIndex = index === currentIndex ? currentIndex - 1 : index;
              self.goToIndex(nextIndex);
            }
          });
        }

        initializePage(pages[i]);
      }

      //hook up click events to all indicators
      var indicators = elem.querySelectorAll('.fade-slider__indicator');
      if (indicators.length > 0) {
        for (var i = 0; i < indicators.length; i++) {
          indicators[i].addEventListener('click', function() {
            var index = $(this).index();
            if (index !== currentIndex) {
              self.goToIndex(index);
            }
          });
        }

        indicators[0].classList.add('active');
      }

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
          elem.classList.add('linear-ease');
          setTimeout(flip, 250);
        } else {
          setTimeout(function() {
            elem.classList.remove('linear-ease');
            //window.bLazy.revalidate();
          }, 350);
        }
      };

      flip();
    };
  };
});
