/* Copyright 2014, Blaise Tine. */

var paletta = paletta || {};

(function () {
    'use strict';

    //--
    var Globals = paletta.Globals;
    var TouchEvent = utils.TouchEvent;

    //--
    var DRAG_TIMEOUT = 1000;    // 1 sec

    var PageSlider = function () {
        //--
        this.page = null;
        this.className = null;
        this.items = [];
        this.itemSize = 0;
        this.onClick = null;
        this.onTouch = null;
        this.onMove = null;
        this.touchHandler = null;
        this.viewportTop = 0;
        this.viewportBottom = 0;
        this.viewportSize = 0;

        //--
        this.activeIndex = 0;
        this.activeItem = null;
        this.touchHoldTimeoutID = null;
        this.touchStartY = 0;
        this.touchPosX = 0;
        this.touchPosY = 0;
        this.onTouchEnabled = false;
        this.scrollValue = -1;
        this.scrollOffset = 0;
        this.pageSize = 0;
        this.dragEnabled = false;
        this.slideEnabled = false;
        this.dragIndex = 0;
        this.moveEnabled = false;
        this.dragTransitionEnd = null;
        this.__positionChanged = true;
        this.clickEvent = null;
    };

    PageSlider.prototype.init = function (page, className, itemSize) {
        //--
        var that = this;

        //--
        this.page = page;
        this.className = className;
        this.itemSize = itemSize;

        //--
        app.touch.attach(page, TouchEvent.ALL, function (event) { that.__onTouch(event); });
    };

    PageSlider.prototype.reset = function () {
        //--
        var page = this.page;
        while (page.firstChild) {
            page.removeChild(page.firstChild);
        }
    };

    PageSlider.prototype.positionChanged = function () {
        //--
        this.__positionChanged = true;
    };

    PageSlider.prototype.addItem = function (index, item) {
        //--
        item.style.top = index * this.itemSize + 'px';

        //--
        var items = this.items;
        var numItems = items.length;
        if (index == numItems) {
            items.push(item);
        } else {
            for (var i = index; i < numItems; ++i) {
                items[i].style.top = (i + 1) * this.itemSize + 'px';
            }
            items.splice(index, 0, item);
        }

        //--
        this.page.appendChild(item);
        this.pageSize += this.itemSize;
    };

    PageSlider.prototype.removeItem = function (index) {
        //--
        var items = this.items;
        this.page.removeChild(items[index]);
        items.splice(index, 1);
        for (var i = index, n = items.length; i <n; ++i) {
            items[i].style.top = i * this.itemSize + 'px';
        }
        this.pageSize -= this.itemSize;
    };

    PageSlider.prototype.moveItem = function (fromIndex, toIndex) {
        //--
        var items = this.items;
        var fromItem = items[fromIndex];
        var step = (toIndex >= fromIndex) ? 1 : -1;
        for (var i = fromIndex; i != toIndex; i += step) {
            var item = items[i + step];
            items[i] = item;
            item.style.top = i * this.itemSize + 'px';
        }
        items[toIndex] = fromItem;
        fromItem.style.top = toIndex * this.itemSize + 'px';
    };

    PageSlider.prototype.getElement = function (index) {
        //--
        return this.items[index];
    };

    PageSlider.prototype.__updatePosition = function () {
        //--
        var rect = this.page.parentNode.getBoundingClientRect();
        this.viewportTop = rect.top;
        this.viewportBottom = rect.bottom;

        var viewportSize = rect.height;
        if (viewportSize != this.viewportSize) {
            this.viewportSize = viewportSize;
            this.scrollOffset = 0;
            this.page.style.webkitTransform = null;
        }

        //--
        this.__positionChanged = false;
    };

    PageSlider.prototype.setTouchHandler = function (touchHandler) {
        //--
        this.touchHandler = touchHandler;
    };

    PageSlider.prototype.__onTouch = function (event) {
        //--
        var that = this;

        //--
        if (this.touchHandler) {
            this.touchHandler(event);
            event.stopPropagation();
            return;
        }

        //--
        if (this.__positionChanged) {
            this.__updatePosition();
        }        
        
        //--
        if (this.touchHoldTimeoutID) {
            window.clearTimeout(this.touchHoldTimeoutID);
            this.touchHoldTimeoutID = null;
        }

        //--
        switch (event.etype) {
        case TouchEvent.START:
            //--
            this.touchPosX = event.touches[0].pageX;
            this.touchPosY = event.touches[0].pageY;
            this.touchStartY = this.touchPosY;
            //--
            this.activeIndex = Math.floor((this.touchStartY + this.scrollOffset - this.viewportTop) / this.itemSize);
            console.assert(this.activeIndex >= 0 && this.activeIndex < this.items.length);
            this.activeItem = this.items[this.activeIndex];
            this.touchHoldTimeoutID = window.setTimeout(function () { that.__touchHold(); }, DRAG_TIMEOUT);
            //--
            this.clickEvent = event;
            break;
        case TouchEvent.MOVE:
            //--
            this.moveEnabled = true;
            //--
            var touchPosX = event.touches[0].pageX;
            var touchPosY = event.touches[0].pageY;
            var deltaX = touchPosX - this.touchPosX;
            var deltaY = touchPosY - this.touchPosY; // current touch delta
            this.touchPosX = touchPosX;
            this.touchPosY = touchPosY;
            var offsetY = touchPosY - this.touchStartY; // total drag offset
            if (this.dragEnabled) {
                // move the current item
                this.activeItem.style.webkitTransform = 'translateY(' + offsetY + 'px)';
                // schedule drag animation if offset bigger than half the item size  
                if (this.dragTransitionEnd == null
                 && Math.abs(offsetY) > (this.itemSize/2)) {
                    this.__onDrag(offsetY, deltaY);
                }
            } else {
                //--
                if (!this.slideEnabled && this.onTouch) {
                    if (this.onTouchEnabled || (Math.abs(deltaX) > Math.abs(deltaY))) {
                        this.onTouchEnabled = true;
                        if (this.onTouch(event, this.activeIndex)) {
                            event.stopPropagation();
                            return;
                        }
                    }
                }

                this.slideEnabled = true;

                //--
                var scrollValue = this.scrollOffset - offsetY;
                if (scrollValue > 0) {
                    if ((this.pageSize - scrollValue) > this.viewportSize) {
                        this.page.style.webkitTransform = 'translateY(-' + scrollValue + 'px)';
                        this.scrollValue = scrollValue;
                    }
                }
            }
            break;
        case TouchEvent.END:
        case TouchEvent.CANCEL:
            //--
            if (this.dragEnabled) {
                if (this.dragTransitionEnd) {
                    this.dragTransitionEnd(null);
                }
                this.activeItem.style.webkitTransform = null;
                this.activeItem.style.opacity = null;
                if ((this.dragIndex != this.activeIndex) && this.onMove) {
                    this.onMove(this.dragIndex, this.activeIndex);
                }
            } else {
                if (this.scrollValue != -1) {
                    //--
                    this.scrollOffset = Math.round(this.scrollValue / this.itemSize) * this.itemSize;
                    this.page.style.webkitTransform = 'translateY(-' + this.scrollOffset + 'px)';
                    this.scrollValue = -1;
                } else {
                    //--
                    if (!this.moveEnabled && this.onClick) {
                        this.onClick(this.clickEvent, this.activeIndex);
                    }
                }
            }
            this.onTouchEnabled = false;
            this.moveEnabled = false;
            this.slideEnabled = false;
            this.dragEnabled = false;
            break;
        }
        //--
        event.stopPropagation();
    };

    PageSlider.prototype.__touchHold = function () {
        //--
        this.touchHoldTimeoutID = null;
        this.dragEnabled = true;
        this.activeItem.style.opacity = 0.5;
        this.dragIndex = this.activeIndex;
    };
    
    PageSlider.prototype.__onDrag = function (offsetY, deltaY) {
        //--
        var that = this;

        //--
        var startIndex = this.activeIndex;
        var itemOffset = Math.round(offsetY / this.itemSize);
        var dstIndex = startIndex + itemOffset;
        var dstItem = this.items[dstIndex];

        // check out-of-bound displacement
        if (dstIndex < 0 || dstIndex >= this.items.length) {
            return;
        }
        
        // check for autoscroll
        var autoScroll = 0;
        var itemPosY = this.activeItem.getBoundingClientRect().top;
        if (itemPosY < this.viewportTop) {
            if (deltaY >= 0) {
                return; // top edge, nothing to drag
            }
            autoScroll = -1;
        } else if ((itemPosY + this.itemSize) > this.viewportBottom) {
            if (deltaY <= 0) {
                return; // bottom edge, nothing to drag
            }
            autoScroll = 1;
        }

        // set drag direction
        var sign = 1;
        var className = this.className + "-moveup";
        if (offsetY < 0) {
            sign = -1;
            className = this.className + "-movedown";
        }

        //--        
        function transitionEndHandler (event) {
            //--
            dstItem.removeEventListener("webkitTransitionEnd", transitionEndHandler, false);
            
            //--
            var items = that.items;
            
            // disable items transition and swap items position
            for (var index = startIndex; index != dstIndex; index += sign) {
                var item = items[index + sign];                
                item.style.top = index * that.itemSize + 'px';
                item.classList.remove(className);
                items[index] = item;
            }

            // update destination item
            items[dstIndex] = that.activeItem;
            that.activeIndex = dstIndex;
            that.activeItem.style.top = dstIndex * that.itemSize + 'px';
            that.touchStartY += itemOffset * that.itemSize;
            var dy = that.touchPosY - that.touchStartY;
            that.activeItem.style.webkitTransform = 'translateY(' + dy + 'px)';

            // autoscroll panel is enabled
            if (autoScroll == -1) {
                that.__autoScroll(-that.itemSize);
            } else if (autoScroll == 1) {
                that.__autoScroll(that.itemSize);
            }
            
            //--
            that.dragTransitionEnd = null;
        };
        
        // register end-of-transition event        
        dstItem.addEventListener("webkitTransitionEnd", transitionEndHandler, false);        
        this.dragTransitionEnd = transitionEndHandler

        // schedule transition trigger
        window.setTimeout(
            function () {
                // apply drag transition className to all following items
                var items = that.items;
                for (var index = startIndex; index != dstIndex; index += sign) {
                    var item = items[index + sign];
                    item.classList.add(className);
                }
            },
            0
        );
    };
    
    PageSlider.prototype.__autoScroll = function (width) {
        //--
        this.touchStartY -= width;
        var dy = this.touchPosY - this.touchStartY;
        this.activeItem.style.webkitTransform = 'translateY(' + dy + 'px)';

        //--
        this.scrollOffset += width;
        this.page.style.webkitTransform = 'translateY(-' + this.scrollOffset + 'px)';
    };


    paletta.PageSlider = PageSlider;
}());
