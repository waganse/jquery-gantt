(function ($) {
    $.fn.ganttView = function () {
        var args = Array.prototype.slice.call(arguments),
            defaults = {
                data: [],
                reserveCountData: [],
                startTime: 0,
                endTime: 24,
                slotTime: 30,
                startBizTime: '0900',
                endBizTime: '2100',
                cellWidth: 50,
                cellHeight: 40,
                blockPadding: 3,
                compactView: false,
                crossRowDrag: true,
                behavior: {
                    hoverable: true,
                    clickable: true,
                    draggable: true,
                    resizable: true,
                    blockedClickable: true,
                    selectable: true
                }
            };

        return $(this).each(function() {
            var element = this,
                $element = $(element),
                ganttView = {},
                params = {};

            _create(args[0]);

            /**
             * @method _create
             * create gantt view function object
             * @member jQuery.ganttView
             * @private
             */
             function _create(options) {
                refresh(options);
                _setWindowResizeEventListener();

                // $element.data('jquery-gantt-view', ganttView);
             }

             /**
             * @method refresh
             * refresh gantt view options
             * @param {Object} options gantt view plugin options
             * @member jQuery.ganttView
             */
            function refresh(options) {
                ganttView = {
                    is: true,
                    element: element,
                    options: $.extend(true, {}, defaults, options),
                    refresh: refresh,
                    updateCount: updateCount
                };

                _build();
                $element.data('jquery-gantt-view', ganttView);
            }

            /**
             * @method _setWindowResizeEventListener
             * set window resize event listerners
             * @member jQuery.ganttView
             * @private
             */
            function _setWindowResizeEventListener() {
                var timer = false,
                    winWidth,
                    winHeight;

                $(window).on('resize', function() {
                    var winNewWidth = $(window).width(),
                        winNewHeight = $(window).height(),
                        onResize = function() {
                            _build();
                        };

                    // compare the new height and width with old one
                    if(winWidth!=winNewWidth || winHeight!=winNewHeight) {
                        if (timer !== false) {
                            clearTimeout(timer);
                        }
                        timer = window.setTimeout(onResize, 50);
                    }
                    //Update the width and height
                    winWidth = winNewWidth;
                    winHeight = winNewHeight;
                });
            }

             /**
             * @method _build
             * draw gantt chart
             * @member jQuery.ganttView
             * @private
             */
            function _build() {
                $element.empty();

                if (ganttView.options.data) {
                    build();
                } else if (ganttView.options.dataUrl) {
                    $.getJSON(ganttView.options.dataUrl, function (data) { 
                        ganttView.options.data = data;
                        build();
                    });
                }

                function build() {
                    var div,
                        $hz;

                    $hzWrap = $('<div>', { 'class': 'gantt-hzheader-wrap'} );
                    $hz = $('<div>', { 'class': 'gantt-hzheader-container'} );
                    $element.append($hzWrap.append($hz.append($('<div>', { 'class': 'gantt-hzheader'}))));
                    $element.append($('<div>', { 'class': 'gantt-chart' }));
                    $element.find('.gantt-chart').append($('<div>', {'class': 'gantt'}));

                    ganttView.options = setOptions(ganttView.options);

                    new Chart($element, ganttView.options).render();
                    new Navigator($element, ganttView.options).apply();
                    new Behavior($element, ganttView.options).apply();

                    $element.append($('<div>', { 'id': 'gantt-block-info' }));
                    $element.append($('<div>', { 'id': 'gantt-overlay' }));
                    $element.append($('<div>', { 'id': 'gantt-select-info' }));
                }
            }

            function updateCount(updIdxArrayObj) {
                var $ganttCount = $('.gantt-count'),
                    opts = $element.data('jquery-gantt-view').options,
                    countData;

                $.each(updIdxArrayObj.reserveIdx, function(i) {
                    countData = opts.reserveCountData[this];
                    countData.available = countData.available - 1;
                    countData.orgAvailable = countData.orgAvailable - 1;

                    $ganttCount.eq(this).find('[data-role=cnt-available]').html(countData.available);
                });

                $.each(updIdxArrayObj.releaseIdx, function(i) {
                    countData = opts.reserveCountData[this];
                    countData.available = countData.available + 1;
                    countData.orgAvailable = countData.orgAvailable + 1;

                    $ganttCount.eq(this).find('[data-role=cnt-available]').html(countData.available);
                });
            }

        });
    };

    function setOptions(opts) {
        var rowIdx = 0,
            countObj = [],
            offTimeIdxArray,
            blockTimeIdxArray,
            i;

        opts.offTime = [];
        opts.blockTime = [];

        $.each(opts.data, function() {
            this.dispFlag = (this.dispFlag === undefined)? true : this.dispFlag;

            $.each(this.series, function() {
                if (this.off) {
                    offTimeIdxArray = getblockTimeIdx(opts, this.off);
                    (opts.offTime).push({
                        rowIdx: rowIdx,
                        timeIdxArray: offTimeIdxArray
                    });
                }
                if (this.block) {
                    blockTimeIdxArray = getblockTimeIdx(opts, this.block);
                    (opts.blockTime).push({
                        rowIdx: rowIdx,
                        timeIdxArray: blockTimeIdxArray
                    });
                }
                rowIdx ++;
            });

        });

        opts.startTime = opts.startTime.toString(10);
        opts.endTime = opts.endTime.toString(10);
        opts.slotNum = Math.floor((opts.endTime - opts.startTime) * 60 / opts.slotTime);
        opts.slotRatio = Math.floor(60 / opts.slotTime);
        opts.bizStartSlotNum = getBizStartSlotNum(opts);
        opts.bizEndSlotNum = getBizEndSlotNum(opts);
        opts.resetCellWidth = opts.resetCellWidth || opts.cellWidth;
        opts.cellWidth = (opts.compactView)? opts.resetCellWidth / 2 : opts.resetCellWidth;
        opts.blockHeight = opts.cellHeight + 1 - opts.blockPadding * 2 - 1;
        opts.hCellWidth = (opts.compactView)? opts.cellWidth * (opts.slotRatio) + (opts.slotRatio - 1) : opts.cellWidth;

        $.each(opts.reserveCountData, function() {
            var timeArray = TimeUtils.getTimeObj(this.time),
                hour = timeArray.hour,
                min = timeArray.min;

            this.idx = TimeUtils.convTime2SlotIdx(hour, min, opts.slotTime);
            this.hour = hour;
            this.min = min;
        });

        for (i = 0; i < opts.slotNum; i++) {
            var timeObj = TimeUtils.convSlotIdx2Time(i, opts.slotTime);

            countObj[i] = {
                idx: i,
                hour: timeObj.hour,
                min: timeObj.min,
                max: 10,
                available: 2,
                orgAvailable: 2,
                time: TimeUtils.timePadding(hour) + TimeUtils.timePadding(min)
            };

            $.each(opts.reserveCountData, function() {
                if (this.idx === i) {
                    countObj[i] = this;
                    countObj[i].orgAvailable = this.available;
                }
            });
        }
        opts.reserveCountData = countObj;

        return opts;
    }

    function getblockTimeIdx(opts, blockTimeArray) {
        var array = [],
            startTime,
            endTime,
            startIdx,
            endIdx,
            i;

        $.each(blockTimeArray, function() {
            startTime = TimeUtils.getTimeObj(this.start);
            endTime = TimeUtils.getTimeObj(this.end);
            startIdx = TimeUtils.convTime2SlotIdx(startTime.hour, startTime.min, opts.slotTime);
            endIdx = TimeUtils.convTime2SlotIdx(endTime.hour, endTime.min, opts.slotTime);

            for (i = startIdx; i < endIdx; i++) {
                array.push(i);
            }
        });
        return array;
    }

    function getBizStartSlotNum(opts) {
        var timeObj = TimeUtils.getTimeObj(opts.startBizTime),
            hour = timeObj.hour,
            min = timeObj.min,
            rangeMin = (hour - opts.startTime) * 60 + min;

            return rangeMin / opts.slotTime;
    }

    function getBizEndSlotNum(opts) {
        var timeObj = TimeUtils.getTimeObj(opts.endBizTime),
            hour = timeObj.hour,
            min = timeObj.min,
            rangeMin = (opts.endTime - hour) * 60 - min;

            return rangeMin / opts.slotTime;
    }

    var Chart = function(div, opts) {
        var $gantt = div.find('.gantt');

        function render() {
            addHzHeader();
            addVtHeader();
            addGrid();
            addBlocks();
            addBlockedBlocks();
            addSlider();

            applyLastClass();

            setInitialPosition();
        }

        function addHzHeader() {
            var $el = $('.gantt-hzheader'),
                totalW = opts.slotNum * (opts.cellWidth + 1);

            $el.width(totalW);
            addHzCountHeader($el);
            addHzTimeHeader($el);
        }

        function addHzCountHeader($el) {
            var $countsDiv = $('<div>', { 'class': 'gantt-counts' }),
                $countDiv = $('<div>', { 'class': 'gantt-count' }),
                $count,
                countObj = [],
                i;

            for (i = 0; i < opts.slotNum; i++) {
                max = 0;
                available = 0;

                $.each(opts.reserveCountData, function() {
                    if (i === this.idx) {
                        max = this.max;
                        available = this.available;
                    }
                });

                $countsDiv.append($countDiv.clone());
                $count = $countsDiv.find('.gantt-count:last-child');

                $count.append($('<div data-role="cnt-max">').text(max));
                $count.append($('<button>', { 'class': 'btn-adjust', 'data-role': 'cnt-up' }).html('&and;'));
                $count.append($('<div data-role="cnt-available">').text(available));
                $count.append($('<button>', { 'class': 'btn-adjust', 'data-role': 'cnt-down' }).html('&or;'));
            }

            $countsDiv.children().width(opts.cellWidth);
            $el.append($countsDiv);
        }

        function addHzTimeHeader($el) {
            var $timesDiv = $('<div>', { 'class': 'gantt-times' }),
                $timeDiv = $('<div>', { 'class': 'gantt-time' }),
                timeStr = '',
                slotNum = (opts.compactView)? opts.slotNum / (60 / opts.slotTime) : opts.slotNum,
                slotRatio = (opts.compactView)? 1 : opts.slotRatio,
                cellWidth = (opts.compactView)? (opts.cellWidth * opts.slotRatio) + (opts.slotRatio - 1) : opts.cellWidth,
                i;

            for (i = 0; i < slotNum; i++) {
                if (i % slotRatio === 0) {
                    timeStr = TimeUtils.timePadding(i / slotRatio) + ':00';
                } else {
                    timeStr = TimeUtils.timePadding(Math.floor(i / slotRatio)) + ':' + TimeUtils.timePadding(opts.slotTime * (i % slotRatio));
                }
                
                $timesDiv.append($timeDiv.clone().width(cellWidth).append(timeStr));
            }

            $el.append($timesDiv);
        }

        function addVtHeader() {
            var $headerDiv = $('<div>', { 'class': 'gantt-vtheader' }),
                itemDiv,
                seriesDiv,
                i,
                j,
                last;

            for (i = 0; i < opts.data.length; i++) {
                if (opts.data[i].dispFlag) {
                    // last = (i === opts.data.length - 1)? 'last' : '';
                    itemDiv = $('<div>', {
                        'class': 'gantt-vtheader-item',
                        'data-staff-id' : opts.data[i].id
                    });

                    itemDiv.append($('<div>', {
                        'class': 'gantt-vtheader-item-name',
                        'css': { height: (opts.data[i].series.length * opts.cellHeight + (opts.data[i].series.length - 1)) + 'px' }
                    }).append(opts.data[i].name));

                    $gantt.append($headerDiv.append(itemDiv));
                }
            }
        }

        function addGrid() {
            var $container = $('<div>', { 'class': 'gantt-grid-container' }),
                $gridDiv = $('<div>', { 'class': 'gantt-grid' }),
                $gridRowWrap,
                $rowDiv,
                last = '',
                w = opts.slotNum * (opts.cellWidth + 1),
                rowIdx = 0,
                i,
                j;

            $gridDiv.width(w);
            opts.gridContainerWidth = w;

            for (i = 0; i < opts.data.length; i++) {
                if (opts.data[i].dispFlag) {
                    $gridRowWrap = $('<div>', {
                        'class': 'gantt-grid-row-wrap',
                        'data-staff-id': opts.data[i].id,
                        'data-staff-name': opts.data[i].name
                    });

                    for (j = 0; j < opts.data[i].series.length; j++) {
                        
                        $rowDiv = getGridRow(opts.data[i], opts.data[i].series[j], rowIdx);

                        if (i === opts.data.length - 1 && j === opts.data[i].series.length -1) {
                            last = 'last';
                        }
                        $gridRowWrap.append($rowDiv);

                        rowIdx = rowIdx + 1;
                    }
                    $gridDiv.append($gridRowWrap.clone());
                }
            }
            $gantt.append($container.append($gridDiv));
        }

        function getGridRow(data, task, rowIdx) {
            var $rowDiv = $('<div>', { 
                    'class': 'gantt-grid-row',
                    'data-staff-id': data.id,
                    'data-staff-name': data.name,
                    'data-task-id': task.id
                }),
                startBizTime = opts.startBizTime - 0,
                endBizTime = opts.endBizTime - 0,
                blockTimeIdxArray,
                $cellDiv,
                nonBizTime = 0,
                blockStartTime,
                blockEndTime,
                blockStartIdx = 0,
                blockEndIdx = 0,
                i;

            for (i = 0; i < opts.slotNum; i++) {
                $cellDiv = $('<div>', { 'class': 'gantt-grid-row-cell' });

                $cellDiv.css({
                    width: opts.cellWidth,
                    height: opts.cellHeight
                });

                if (i % opts.slotRatio === 0) {
                    nonBizTime = (i / opts.slotRatio + '00') - 0;
                } else {
                    nonBizTime = (Math.floor(i / opts.slotRatio) + '' + opts.slotTime * (i % opts.slotRatio)) - 0;
                }

                // Non business hour
                if (nonBizTime < startBizTime || endBizTime <= nonBizTime) {
                    $cellDiv.addClass('non-biz');
                }

                // Block time
                $.each(opts.blockTime, function() {
                    if (this.rowIdx === rowIdx && ArrayUtils.contains(this.timeIdxArray, i)) {
                        $cellDiv.addClass('blocked');
                    }
                });

                // Off time
                $.each(opts.offTime, function() {
                    if (this.rowIdx === rowIdx && ArrayUtils.contains(this.timeIdxArray, i)) {
                        $cellDiv.addClass('off');
                    }
                });

                $rowDiv.append($cellDiv);
            }

            return $rowDiv;
        }

        function addBlocks() {
            var $containerWrap = div.find('.gantt-grid-container'),
                $container = $('<div>', { 'class': 'gantt-block-container'}),
                rowIdx = 0,
                startIdx,
                endIdx,
                series,
                hour,
                size,
                offset,
                block,
                timeObj,
                staffId,
                i,
                j,
                k;

            for (i = 0; i < opts.data.length; i++) {
                if (opts.data[i].dispFlag) {
                    staffId = opts.data[i].id;

                    for (j = 0; j < opts.data[i].series.length; j++) {
                        lineId = opts.data[i].series[j].id;
                        series = opts.data[i].series[j];

                        $.each(series.booking, function() {
                            var booking = this;

                            hour = TimeUtils.timesBetween(booking.start, booking.end);
                            size = hour * 60 / opts.slotTime;
                            offset = TimeUtils.timesBetween(opts.startTime, booking.start) * 60 / opts.slotTime;

                            booking.staffId = staffId;
                            booking.lineId = lineId;
                            booking.rowIdx = booking.rowIdx || rowIdx;
                            booking.orgTopPos = booking.rowIdx * (opts.cellHeight + 1) + opts.blockPadding - 1;
                            booking.orgLeftPos = offset * (opts.cellWidth + 1) + opts.blockPadding + 1;
                            booking.baseTopPos = booking.orgTopPos;
                            booking.baseLeftPos = booking.orgLeftPos;
                            booking.topPos = booking.orgTopPos;
                            booking.leftPos = booking.orgLeftPos;
                            booking.hour = hour;
                            booking.width = size * (opts.cellWidth + 1) - opts.blockPadding * 2 - 2;
                            booking.rangeCellNum = size;
                            timeObj = TimeUtils.getTimeObj(booking.start);
                            booking.startTimeStr = TimeUtils.timePadding(timeObj.hour) + ':' + TimeUtils.timePadding(timeObj.min);
                            startIdx = TimeUtils.convTime2SlotIdx(timeObj.hour, timeObj.min, opts.slotTime);
                            timeObj = TimeUtils.getTimeObj(booking.end);
                            booking.endTimeStr = TimeUtils.timePadding(timeObj.hour) + ':' + TimeUtils.timePadding(timeObj.min);
                            endIdx = TimeUtils.convTime2SlotIdx(timeObj.hour, timeObj.min, opts.slotTime) - 1;
                            booking.statusLabel = '';
                            $.each(BOOKING_STATUS, function() {
                                if (this.id === booking.status) {
                                    booking.statusLabel = this.label;
                                }
                            });
                            booking.paymentLabel = '';
                            $.each(PAYMENT, function() {
                                if (this.id === booking.payment) {
                                    booking.paymentLabel = this.label;
                                }
                            });
                            booking.price = PriceUtils.formatter(booking.price);
                            booking.pre_card_payment = PriceUtils.formatter(booking.pre_card_payment);
                            booking.bill = PriceUtils.formatter(booking.bill);
                            booking.idxArray = [];
                            for (k = startIdx; k <= endIdx; k++) {
                                (booking.idxArray).push(k);
                            }

                            block = $('<div>', {
                                'class': 'gantt-block',
                                'css': {
                                    position: 'absolute',
                                    top: booking.orgTopPos,
                                    left: booking.orgLeftPos,
                                    width: size * (opts.cellWidth + 1) - opts.blockPadding * 2 - 2 + 'px',
                                    height: opts.blockHeight + 'px'
                                }
                            });

                            addBlockData(block, opts.data[i], booking);

                            block.append($('<div>', { 'class': 'gantt-block-text' }).text(hour + ' h'));
                            $container.append(block);
                        });

                        rowIdx = rowIdx + 1;
                    }
                }
            }
            $containerWrap.append($container);
        }
        
        function addBlockedBlocks() {
            var $containerWrap = div.find('.gantt-grid-container'),
                $container = $('<div>', { 'class': 'gantt-block-container'}),
                rowIdx = 0,
                startIdx,
                endIdx,
                series,
                hour,
                size,
                offset,
                box,
                timeObj,
                staffId,
                i,
                j,
                k;

            for (i = 0; i < opts.data.length; i++) {
                if (opts.data[i].dispFlag) {
                    staffId = opts.data[i].id;

                    for (j = 0; j < opts.data[i].series.length; j++) {
                        lineId = opts.data[i].series[j].id;
                        series = opts.data[i].series[j];

                        if (series.block) {
                            $.each(series.block, function() {
                                var block = this;

                                hour = TimeUtils.timesBetween(block.start, block.end);
                                size = hour * 60 / opts.slotTime;
                                offset = TimeUtils.timesBetween(opts.startTime, block.start) * 60 / opts.slotTime;

                                block.staffId = staffId;
                                block.lineId = lineId;
                                block.rowIdx = block.rowIdx || rowIdx;
                                block.orgTopPos = block.rowIdx * (opts.cellHeight + 1) + opts.blockPadding - 1;
                                block.orgLeftPos = offset * (opts.cellWidth + 1) + opts.blockPadding + 1;
                                block.baseTopPos = block.orgTopPos;
                                block.baseLeftPos = block.orgLeftPos;
                                block.topPos = block.orgTopPos;
                                block.leftPos = block.orgLeftPos;
                                block.hour = hour;
                                block.width = size * (opts.cellWidth + 1) - opts.blockPadding * 2 - 2;
                                block.rangeCellNum = size;
                                timeObj = TimeUtils.getTimeObj(block.start);
                                block.startTimeStr = TimeUtils.timePadding(timeObj.hour) + ':' + TimeUtils.timePadding(timeObj.min);
                                startIdx = TimeUtils.convTime2SlotIdx(timeObj.hour, timeObj.min, opts.slotTime);
                                timeObj = TimeUtils.getTimeObj(block.end);
                                block.endTimeStr = TimeUtils.timePadding(timeObj.hour) + ':' + TimeUtils.timePadding(timeObj.min);
                                endIdx = TimeUtils.convTime2SlotIdx(timeObj.hour, timeObj.min, opts.slotTime) - 1;
                                block.idxArray = [];
                                for (k = startIdx; k <= endIdx; k++) {
                                    (block.idxArray).push(k);
                                }

                                box = $('<div>', {
                                    'class': 'gantt-block blocked',
                                    'css': {
                                        position: 'absolute',
                                        top: block.orgTopPos,
                                        left: block.orgLeftPos,
                                        width: size * (opts.cellWidth + 1) - opts.blockPadding * 2 - 2 + 'px',
                                        height: opts.blockHeight + 'px'
                                    }
                                });

                                addBlockData(box, opts.data[i], block);

                                $container.append(box);
                            });
                        }
    
                        rowIdx = rowIdx + 1;
                    }
                }
            }
            $containerWrap.append($container);
        }

        function addBlockData(block, data, booking) {
            var blockData = $.extend(blockData, booking);

            block.data('block-data', blockData);
        }

        function addSlider() {
            var $container = $('<div>', { 'class': 'slider-wrap' }),
                $adjuster = $('<div>', { 'class': 'slider-adjust' }),
                $slider = $('<div>', { 'class': 'slider' });

            $slider.width($('.gantt-grid-container').width()).append($('<div>')).append($('<span>'));
            $container.append($adjuster).append($slider);
            div.append($container);
        }

        function applyLastClass() {
            $('.gantt-grid-row-cell:last-child').addClass('last');
        }

        function setInitialPosition() {
            var $ganttContainer = $('.gantt-grid-container'),
                $gantt = $('.gantt-grid'),
                $ganttBlock = $('.gantt-block'),
                $ganttHzHeader = $('.gantt-hzheader'),
                $slider = $('.slider'),
                $handler = $slider.find('span'),
                wDiff = $gantt.width() - $ganttContainer.width(),
                curTime = new Date(),
                curHour = curTime.getHours() - 0,
                curMin = curTime.getMinutes() - 0,
                curMinTotal,
                leftPos,
                hIdx,
                gIdx,
                value,
                i;

            curTime = getClosestTime(curHour, curMin);
            curMinTotal = curTime.hour * 60 + curTime.min;
            leftPos = -(curMinTotal / opts.slotTime * (opts.cellWidth + 1));
            hIdx = (opts.compactView)? Math.floor((curMinTotal / opts.slotTime) / opts.slotRatio) : Math.floor(curMinTotal / opts.slotTime);
            gIdx = Math.floor(curMinTotal / opts.slotTime);

            setTimeout(function() {
                var wContainer = $ganttContainer.width(),
                    wGantt = $gantt.width();

                if (Math.abs(leftPos) > wGantt - wContainer) {
                    leftPos = -(wGantt - wContainer);
                    value = $slider.width();
                    // opts.adjustedRight = true;
                    // opts.adjustedLeft = false;
                } else {
                    leftPos = -(curMinTotal / opts.slotTime * (opts.cellWidth + 1));
                    value = $slider.width() * (-leftPos / wDiff);
                }

                $('.gantt-time').eq(hIdx).addClass('now');
                setPosition();
            }, 0);

            function setPosition() {
                $ganttHzHeader.css({ marginLeft: leftPos + 'px' });
                $gantt.css({ marginLeft: leftPos + 'px' });
                $ganttBlock.each(function() {
                    var self = $(this),
                        selfData = self.data('block-data'),
                        pos = selfData.leftPos;

                    self.css({ left: pos + leftPos });

                    selfData.leftPos = pos + leftPos;
                    selfData.orgLeftPos = pos + leftPos;
                    selfData.baseLeftPos = pos + leftPos - (wDiff + leftPos);
                });
                $handler.css({left: (value - $handler.width() / 2) + 'px'});
            }
        }

        function getClosestTime(hour, min) {
            var time = {},
                curSlotRatio = Math.floor(min / opts.slotTime);
            
            if (curSlotRatio === opts.slotRatio) {
                time = {
                    hour: hour + 1,
                    min: 0
                };
            } else {
                time = {
                    hour: hour,
                    min: opts.slotTime * curSlotRatio
                };
            }
            return time;
        }
        return {
            render: render
        };
    };

    var Navigator = function (div, opts) {
        var $document = $(document),
            $slider = div.find('.slider'),
            $ganttContainer = div.find('.gantt-grid-container'),
            $gantt = div.find('.gantt-grid'),
            $hzHeader = div.find('.gantt-hzheader'),
            $ganttBlock = div.find('.gantt-block'),
            $handler = $slider.find('span'),
            sliderWidth = $slider.width(),
            ganttContainerWidth = $ganttContainer.width(),
            ganttWidth = $gantt.width(),
            diffWidth = ganttWidth - ganttContainerWidth,
            ganttMgnL = 0,
            dragging = false,
            value = 0,
            width = $handler.width() / 2,
            clientX;

        function apply() {
            handler();
        }

        function setValue() {
            var slideRatio = value / sliderWidth,
                moveWidth = diffWidth * slideRatio;

            $hzHeader.css({ marginLeft: -moveWidth + 'px' });
            $gantt.css({ marginLeft: -moveWidth + 'px' });

            $ganttBlock.each(function() {
                var self = $(this),
                    data = self.data('block-data'),
                    newLeftPos;

                newLeftPos = data.baseLeftPos + (diffWidth - moveWidth);

                self.css({ left: newLeftPos + 'px' });
                data.leftPos = newLeftPos;
                data.orgLeftPos = newLeftPos;
            });
            $handler.css({left: (value - $handler.width() / 2) + 'px'});

            curMgnL = ganttMgnL;
        }

        function handler() {
            $slider.on('click', function(e){
                dragging = true;
                clientX = e.clientX;
                $document.trigger('mousemove');
                $document.trigger('mouseup');
            });

            $handler.on('mousedown', function(e) {
                dragging = true;
                return false;
            });

            $document.on('mouseup', function(e) {
                if (dragging) {
                    dragging = false;
                }
            });

            $document.on('mousemove', function(e) {
                var left,
                    rect = $slider.offset();

                if (dragging) {
                    left = e.clientX || clientX;

                    value = Math.round(left - rect.left - width);

                    if (value < 0) {
                        value = 0;
                    } else if (value > $slider.width()) {
                        value = $slider.width();
                    }
                    setValue();
                    return false;
                }
            });
        }

        function updateBlockPos(w, el) {
            var self = $(el),
                selfData = self.data('block-data'),
                leftPos = selfData.leftPos,
                orgLeftPos = selfData.orgLeftPos;

            selfData.leftPos = leftPos + w;
            selfData.orgLeftPos = orgLeftPos + w;
        }

        function onClickSwitchView() {
            $('.js-switch-view').on('click', function() {
            });
        }

        return {
            apply: apply
        };

    };

    var Behavior = function (div, opts) {
        function apply() {
            if (opts.behavior.hoverable) {
                onBlockHover();
            }
            if (opts.behavior.clickable) {
                onBlockClick();
            }
            if (opts.behavior.selectable) {
                onGridSelect();
            }
            if (opts.behavior.blockedClickable) {
                onBlockedCellClick();
            }
            if (opts.behavior.resizable) {
                onBlockResize();
            }
            if (opts.behavior.draggable) {
                onBlockDrag();
            }
            onCountBtnClick();
        }

        function onBlockHover() {
            div.find('.gantt-block').on('mouseenter', function () {
                if (opts.behavior.onHover) { opts.behavior.onHover($(this).data('block-data'), $(this)); }
            })
            .on('mouseleave', function() {
                $('#gantt-block-info').hide();
            });
        }

        function onBlockClick() {
            div.find('.gantt-block').on('click', function () {
                if (opts.behavior.onBlockedClick) { opts.behavior.onBlockedClick($(this).data('block-data'), opts); }
            });
        }

        function onBlockedCellClick() {
            div.find('.blocked').on('click', function () {
                if (opts.behavior.onClick) { opts.behavior.onClick($(this).data('block-data'), opts); }
            });
        }

        function onGridSelect() {
            div.find('.gantt-grid').selectable({
                filter: ".gantt-grid-row-cell:not('.non-biz')",
                stop: function(e, ui) { // ui is always empty
                    var errFlag = false,
                        overflowFlag = false,
                        $selected = $('.ui-selected'),
                        $modal = $('.modal'),
                        template = $('#modal-err-template').html(),
                        targetData = [],
                        idxArrayObj = {
                            reserveIdx: [],
                            releaseIdx: []
                        },
                        errMsg,
                        i;

                    $selected.each(function() {
                        var self = $(this);

                        if (!isSelectable(self)) {
                            errFlag = true;
                            errMsg = '選択できないブロックです。';
                        }
                    });

                    targetData = getTargetData(setSelectedData($selected));

                    if (isSelectCountOverflow(targetData)) {
                        overflowFlag = true;
                        errMsg = '予約可能数を超えているため選択できません。';
                    }

                    if (!errFlag && !overflowFlag) {
                        if (opts.behavior.onSelect) {
                            opts.behavior.onSelect($selected, targetData, opts);
                        }
                    } else {
                        ModalUtils.showErrModal(errMsg);
                    }
                }
            });
        }

        function isSelectable(el) {
            var flag = true,
                $block = div.find('.gantt-block'),
                elTop = el.position().top,
                elLeft = el.position().left,
                elBottom = el.position().top + opts.cellHeight,
                elRight = el.position().left + opts.cellWidth;

            if (el.hasClass('restricted')) {
                flag = false;
            } else {
                $block.each(function() {
                    var self = $(this),
                        blockTop = self.data('block-data').topPos,
                        blockLeft = self.data('block-data').leftPos,
                        blockRight = self.data('block-data').leftPos + self.data('block-data').width;

                    if (elTop < blockTop && blockTop < elBottom) {
                        if (elLeft < blockLeft && blockLeft < elRight) {
                            flag = false;
                        } else if (elLeft < blockRight && blockRight < elRight) {
                            flag = false;
                        } else if (blockLeft < elLeft && elLeft < blockRight) {
                            flag = false;
                        }
                    }
                });
            }
            return flag;
        }

        function setSelectedData(el) {
            var dataArray = [],
                cellData;

            el.each(function() {
                var self = $(this),
                    parent = self.parent(),
                    curTaskId = self.parent().data('taskId'),
                    staffId,
                    staffName,
                    taskId,
                    fromHour,
                    fromMin,
                    toHour,
                    toMin,
                    idx;

                if (taskId !== curTaskId) {
                    staffId = parent.data('staffId');
                    staffName = parent.data('staffName');
                    taskId = parent.data('taskId');
                }

                fromHour = TimeUtils.timePadding(Math.floor(self.index() / opts.slotRatio));
                fromMin =  TimeUtils.timePadding(self.index() % opts.slotRatio * opts.slotTime);
                toHour = TimeUtils.timePadding(Math.floor((self.index() + 1) / opts.slotRatio));
                toMin = TimeUtils.timePadding((self.index() + 1) % opts.slotRatio * opts.slotTime);

                cellData = {
                    staffId: staffId,
                    staffName: staffName,
                    taskId: taskId,
                    fromHour: fromHour,
                    fromMin: fromMin,
                    toHour: toHour,
                    toMin: toMin,
                    idx: self.index()
                };

                dataArray.push(cellData);
            });
            return dataArray;
        }

        function isSelectCountOverflow(selectData) {
            var errFlag = false,
                cntTask = selectData.length,
                baseTask = selectData[0];

            $.each(baseTask.idxArray, function(i) {
                var countData = opts.reserveCountData[baseTask.idxArray[i]],
                    availCount = countData.available;

                if (availCount < cntTask) {
                    errFlag = true;
                }
            });
            return errFlag;
        }

        function getTargetData(cellArray) {
            var dataArray = [],
                idxArray = [],
                taskData,
                taskId;

            $.each(cellArray, function(i) {
                if (taskId === this.taskId) {
                    toHour = this.toHour;
                    toMin = this.toMin;
                    idxArray.push(this.idx);

                    taskData = {
                        staffId: this.staffId,
                        staffName: this.staffName,
                        taskId: this.taskId,
                        fromHour: fromHour,
                        fromMin: fromMin,
                        toHour: toHour,
                        toMin: toMin,
                        idxArray: idxArray
                    };
                } else {
                    if (i) {
                        dataArray.push(taskData);
                        idxArray.length = 0;
                        idxArray.push(this.idx);
                        taskData = this;
                    } else {
                        taskData = this;
                        idxArray.push(this.idx);
                        taskData.idxArray = idxArray;
                    }
                    fromHour = this.fromHour;
                    fromMin = this.fromMin;
                    taskId = this.taskId;
                }
            });
            dataArray.push(taskData);
            return dataArray;
        }

        function onBlockResize() {
            div.find('.gantt-block').resizable({
                grid: opts.cellWidth + 1,
                handles: 'e, w',
                stop: function (e, ui) {
                    var block = $(this),
                        blockData = block.data('block-data');

                    if (updateDataAndPosition(block, ui)) {
                        blockData.topPos = ui.position.top;
                        blockData.leftPos = ui.position.left;
                        blockData.width = ui.size.width;

                        if (opts.behavior.onResize) { opts.behavior.onResize(blockData); }
                    } else {
                        block.animate({
                            'top': blockData.topPos,
                            'left': blockData.leftPos,
                            'width': blockData.width
                        });
                    }
                }
            }).on('resize', function (e) {
                e.stopPropagation();
            });
        }
        
        function onBlockDrag() {
            var axis = (opts.crossRowDrag)? 'x,y' : 'x';

            div.find('.gantt-block').draggable({
                axis: axis,
                grid: [opts.cellWidth + 1, opts.cellHeight + 1],
                start: function(e, ui) {
                    div.find('.gantt-block').off('click');
                    div.find('.gantt-block').off('mouseenter');
                    $('#gantt-block-info').hide();
                },
                stop: function (e, ui) {
                    var block = $(this);

                    if (updateDataAndPosition(block, ui)) {
                        if (opts.behavior.onDrag) { opts.behavior.onDrag(block.data('block-data')); }
                    } else {
                        block.animate({
                            'top': block.data('block-data').topPos,
                            'left': block.data('block-data').leftPos
                        });
                    }
                    setTimeout(function() {
                        div.find('.gantt-block').on('click', function () {
                            if (opts.behavior.onClick) { opts.behavior.onClick($(this).data('block-data'), opts); }
                        });
                        div.find('.gantt-block').on('mouseenter', function () {
                            if (opts.behavior.onHover) { opts.behavior.onHover($(this).data('block-data'), $(this)); }
                        });
                    }, 200);
                }
            });
        }
        
        function updateDataAndPosition(block, ui) {
            var ganttView = div.data('jquery-gantt-view'),
                $ganttContainer = div.find('.gantt-grid-container'),
                $grid = div.find('.gantt-grid'),
                $gridRow = div.find('.gantt-grid-row'),
                $block = div.find('.gantt-block'),
                gridMgnL = ($grid.css('margin-left')).substr(0, $grid.css('margin-left').length - 2) - 0,
                scroll = $ganttContainer.scrollLeft(),
                offset = block.offset().left - $ganttContainer.offset().left - 1 - gridMgnL + scroll,
                width = block.outerWidth(),
                diffWidth = $grid.width() - $ganttContainer.width(),
                blockData = block.data('block-data'),
                blockIdx = {
                    start: Math.round(offset / (opts.cellWidth + 1)),
                    end: Math.round((offset + width) / (opts.cellWidth + 1)) - 1
                },
                updIdxArray = getUpdIdxArray(blockData.idxArray, blockIdx),
                startTime = blockIdx.start * (opts.slotTime / 60),
                startHour = Math.floor(startTime),
                startMin = TimeUtils.timePadding((startTime - startHour) * 60),
                newStart = startHour + startMin,
                endTime = startTime + (Math.round(width / opts.cellWidth) * (opts.slotTime / 60)),
                endHour = Math.floor(endTime),
                endMin = TimeUtils.timePadding((endTime - endHour) * 60),
                newEnd = endHour + endMin,
                newLineId,
                errFlag = false,
                errMsg,
                i;

            $.each($block, function() {
                var self = $(this),
                    data = self.data('block-data');

                if (data.number === blockData.number ) {
                    return true;
                }
                if (isDoubleBooking(self, block, ui)) {
                    errFlag = true;
                    errMsg = '予定が重複しているため移動できません。';
                }
            });

            // if (isOffBiz(block, ui)) {
            //     errFlag = true;
            //     errMsg = '営業時間外です。';
            // }

            if (isBlockTime(block, ui, blockIdx)) {
                errFlag = true;
                errMsg = '予約制限がかかっているため移動できません。';
            }

            if (isCountOverflow(updIdxArray)) {
                errFlag = true;
                errMsg = '予約可能数を超えているため移動できません。';
            }

            if (!isValidRange(blockData, ui)) {
                return false;
            } else if (errFlag) {
                ModalUtils.showErrModal(errMsg);
                return false;
            } else {
                blockData.rowIdx = Math.floor(ui.position.top / (opts.cellHeight + 1));
                newLineId = $gridRow.eq(blockData.rowIdx).data('taskId');
                blockData.start = newStart;
                blockData.end = newEnd;
                blockData.topPos = ui.position.top;
                blockData.leftPos = ui.position.left;
                blockData.baseLeftPos = ui.position.left - (diffWidth + gridMgnL);

                (blockData.idxArray).length = 0;
                for (i = blockIdx.start; i <= blockIdx.end; i++) {
                    (blockData.idxArray).push(i);
                } 

                $('.gantt-block-text', block).text((endTime - startTime) + ' h');

                ganttView.updateCount(updIdxArray);

                $.each(opts.data, function(){
                    var self = this;

                    if (self.id === blockData.staffId) {
                        $.each(self.series, function() {
                            var line = this;

                            if (line.id === blockData.lineId) {
                                $.each(line.booking, function() {
                                    var booking = this;

                                    if (booking.number === blockData.id) {
                                        booking.start = newStart;
                                        booking.end = newEnd;
                                        booking.lineId = newLineId;
                                        booking.rowIdx = blockData.rowIdx;
                                    }
                                });
                            }
                        });
                    }
                });

                return true;
            }
        }

        return {
            apply: apply
        };

        function getUpdIdxArray(blockIdx, newBlockIdx) {
            var idxArray = [],
                reserveIdx = [],
                releaseIdx = [],
                i;

            for (i = newBlockIdx.start; i <= newBlockIdx.end; i++) {
                idxArray.push(i);
            }

            $.each(blockIdx, function(i) {
                if (!ArrayUtils.contains(idxArray, blockIdx[i])) {
                    releaseIdx.push(blockIdx[i]);
                }
            });

            $.each(idxArray, function(i) {
                if (!ArrayUtils.contains(blockIdx, idxArray[i])) {
                    reserveIdx.push(idxArray[i]);
                }
            });

            return {
                reserveIdx: reserveIdx,
                releaseIdx: releaseIdx
            };
        }

        function isDoubleBooking(aBlock, block, ui) {
            var aBlockData = aBlock.data('block-data'),
                targetBlockWidth = (ui.size)? ui.size.width : block.data('block-data').width;

            if (aBlockData.topPos - opts.blockPadding <= ui.position.top && (aBlockData.topPos + opts.blockHeight + opts.blockPadding) >= ui.position.top &&
                (aBlockData.leftPos <= ui.position.left && (aBlockData.leftPos + aBlockData.width) >= ui.position.left ||
                 aBlockData.leftPos >= ui.position.left && aBlockData.leftPos <= (ui.position.left + targetBlockWidth)) ) {
                return true;
            }
            return false;
        }

        // function isOffBiz(block, ui) {
        //     var slideMgn = parseInt($('.gantt-grid').css('margin-left')),
        //         blockData = block.data('block-data'),
        //         startBorderPos = opts.bizStartSlotNum * opts.cellWidth + slideMgn,
        //         endBorderPos = opts.gridContainerWidth - opts.bizEndSlotNum * opts.cellWidth + slideMgn,
        //         blockWidth = (ui.size)? ui.size.width : blockData.width;

        //     if (ui.position.left <= startBorderPos || endBorderPos <= ui.position.left + blockWidth) {
        //         return true;
        //     }
        //     return false;
        // }

        function isBlockTime(block, ui, blockIdx) {
            var flag = false,
                blockData = block.data('block-data'),
                blockWidth = (ui.size)? ui.size.width : blockData.width,
                blockIdxRange = [],
                rowIdx = Math.floor(ui.position.top / (opts.cellHeight + 1)),
                i;

            for (i = blockIdx.start; i <= blockIdx.end; i++) {
                blockIdxRange.push(i);
            }

            $.each(opts.blockTime, function() {
                var len = (this.timeIdxArray)? this.timeIdxArray.length : 0;

                if (this.rowIdx === rowIdx) {
                    for(i = 0, len; i < len; i++) {
                        if (ArrayUtils.contains(blockIdxRange, this.timeIdxArray[i])) {
                            flag = true;
                        }
                    }
                }
            });
            return flag;
        }

        function isCountOverflow(updIdxArray) {
            var flag = false;

            $.each(opts.reserveCountData, function() {
                var self = this;

                if (ArrayUtils.contains(updIdxArray.reserveIdx, self.idx)) {
                    if (self.available === 0) {
                        flag = true;
                    }
                }
            });
            return flag;
        }

        function isValidRange(blockData, ui) {
            var $ganttContainer = div.find('.gantt-grid-container'),
                $grid = div.find('.gantt-grid'),
                ganttMgnL = ($grid.css('margin-left')).substr(0, $grid.css('margin-left').length - 2) - 0;

            if (ui.position.top < 0 || $ganttContainer.height() < ui.position.top ||
                ui.position.left < 0 + ganttMgnL || $ganttContainer.width() < ui.position.left + blockData.width) {
                return false;
            }
            return true;
        }

        // function updateCount(updIdxArrayObj) {
        //     var $ganttCount = $('.gantt-count'),
        //         countData;

        //     $.each(updIdxArrayObj.reserveIdx, function(i) {
        //         countData = opts.reserveCountData[this];
        //         countData.available = countData.available - 1;
        //         countData.orgAvailable = countData.orgAvailable - 1;

        //         $ganttCount.eq(this).find('[data-role=cnt-available]').html(countData.available);
        //     });

        //     $.each(updIdxArrayObj.releaseIdx, function(i) {
        //         countData = opts.reserveCountData[this];
        //         countData.available = countData.available + 1;
        //         countData.orgAvailable = countData.orgAvailable + 1;

        //         $ganttCount.eq(this).find('[data-role=cnt-available]').html(countData.available);
        //     });
        // }

        function onCountBtnClick() {
            var $cntBtn = $('.btn-adjust');

            $cntBtn.on('click', function() {
                var self = $(this),
                    role = self.data('role'),
                    idx = self.parent().index(),
                    $availCount = self.parent().find('[data-role=cnt-available]'),
                    curCount = $availCount.html() - 0,
                    countData = opts.reserveCountData[idx],
                    maxCount = countData.max,
                    availCount = countData.orgAvailable,
                    updNum;

                if (role === 'cnt-up') {
                    updNum = 1;
                } else {
                    updNum = -1;
                }
                updNum = curCount + updNum;

                if (updNum < 0 || availCount < updNum) {
                    return;
                } else {
                    $availCount.html(updNum);
                    countData.available = updNum;
                }
            });
        }
    };


    /**
     * Utility Time
     * @type {Object}
     */
    var TimeUtils = {
        timesBetween: function(start, end) {
            var startTime = TimeUtils.getTimeObj(start),
                startHour = startTime.hour,
                startMin = startTime.min / 60 || 0,
                start = startHour + startMin,
                endTime = TimeUtils.getTimeObj(end),
                endHour = endTime.hour,
                endMin = endTime.min / 60,
                end = endHour + endMin;

            return (end - start);
        },

        getTimeObj: function(str) {
            return {
                hour: str.substr(0, 2) - 0,
                min: str.substr(2, 2) - 0
            }
        },

        timePadding: function(time) {
            time = '00' + time;
            return time.substr(time.length - 2, 2);
        },

        convTime2SlotIdx: function(h, m, slotTime) {
            return (h * 60 + m) / slotTime;
        },

        convSlotIdx2Time: function(idx, slotTime) {
            var totalMin = idx * slotTime;
                hour = Math.floor(totalMin / 60),
                min = totalMin % 60;

            return {
                hour: hour,
                min: min
            }
        }
    };

    /**
     * Utility Array
     * @type {Object}
     */
    var ArrayUtils = {
        contains: function(arr, obj) {
            var has = false;

            for (var i = 0; i < arr.length; i++) {
                if (arr[i] === obj) {
                    has = true;
                }
            }
            return has;
        }
    };

    var PriceUtils = {
        formatter: function(num) {
            var money = num + ''.replace(/,/g, '');

            while(money !== (money = money.replace(/^(-?\d+)(\d{3})/, '$1,$2')));

            return money;
        }
    };

    var ModalUtils = {
        showErrModal: function(msg) {
            var $modal = $('.modal'),
                template = $('#modal-err-template').html();

            $modal.html(_.template(template, { errMsg: msg }));

            setTimeout(function() {
                $.colorbox({
                    inline: true,
                    href: '.modal',
                    width: 635,
                    padding: 0,
                    scrolling: false,
                    opacity: 0.4,
                    closeButton: false,
                    onClosed: function() {
                        $('.gantt-grid-row-cell').removeClass('ui-selected');
                    }
                });
            }, 0);
        }
    };

})(jQuery);