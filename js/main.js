;(function($){

    $(function () {
        var url = window.location.href,
            file = url.match("(.+/.*?)([\?#;].*)?$")[1],
            param = url.match("(.+/.*?)([\?#;].*)?$")[2],
            dateArray = [new Date().getFullYear(), ('0' + (new Date().getMonth() + 1)).slice(-2), ('0' + new Date().getDate()).slice(-2)],
            param = (param)? param.substr(-8) : dateArray.join(''),
            $ganttView = $('#gantt-view'),
            $datePicker = $('#datepicker'),
            options;

        /**
         * Initial options for gantt
         * @type {Object}
         */
        options = {
            data: DATA,
            reserveCountData: RESERVE_COUNT_DATA,
            startTime: CONFIG.START_TIME,
            endTime: CONFIG.END_TIME,
            slotTime: CONFIG.SLOT_TIME,
            startBizTime: CONFIG.START_BIZ_TIME,
            endBizTime: CONFIG.END_BIZ_TIME,
            compactView: CONFIG.COMPACT_VIEW,
            crossRowDrag: true,
            behavior: {
                onHover: function (data, el) {
                    var $tooltip = $('#gantt-block-info'),
                        template = $('#tooltip-block-info-template').html(),
                        leftPos = el.offset().left;

                    $tooltip.removeClass('right');

                    if (data.leftPos < 0) {
                        leftPos = $('.gantt-vtheader').width();
                    } else if ($(window).width() - el.offset().left < el.width()) {
                        leftPos = $(window).width() - $('#gantt-block-info').width() - 5;
                        $tooltip.addClass('right');
                    }

                    $tooltip.html(_.template(template, data)).css({
                        top: el.offset().top + el.height() + 3,
                        left: leftPos
                    }).show();
                },
                onClick: function (data, opts) {
                    var $modal = $('.modal'),
                        template = $('#modal-block-template').html();

                    // Get editing status
                    $.ajax({
                        url: 'api/edit.json',
                        data: {
                            number: data.number
                        }
                    }).done(function(res) {
                        data.onEditFlag = res.data;
                        data.btnClass = (data.onEditFlag)? 'off' : '';
                        data.disableAttr = (data.onEditFlag)? 'disabled="true"' : '';

                        $modal.html(_.template(template, data));
                        setTimeout(function() {
                            openModal();

                            $('.js-cancel').data('book', data);

                            $('.js-cancel').on('click', function() {
                                var stemplate = $('#modal-cancel-template').html();

                                $modal.html(_.template(stemplate, data));
                                $.colorbox.resize();

                                $('.js-exec').on('click', function() {
                                    var ganttView = $ganttView.data('jquery-gantt-view');

                                    // Get updated all data
                                    $.ajax({
                                        url: 'api/cancel.json',
                                        data: {
                                            number: data.number
                                        }
                                    }).done(function(res) {
                                        opts.data = res.data;
                                        ganttView.refresh(opts);
                                        $.colorbox.close();
                                    }).fail(function() {
                                        showErrModal('予期せぬエラーが発生しました。', true);
                                    });

                                });
                            });
                        }, 0);
                    }).fail(function() {
                        showErrModal('予期せぬエラーが発生しました。');
                    });
                },
                onResize: function (data) { 
                    var msg = "You resized an event: { start: " + data.start.toString("M/d/yyyy") + ", end: " + data.end.toString("M/d/yyyy") + " }";
                    $("#eventMessage").text(msg);
                },
                onDrag: function (data) { 
                    var msg = "You dragged an event: { start: " + data.start.toString("M/d/yyyy") + ", end: " + data.end.toString("M/d/yyyy") + " }";
                    $("#eventMessage").text(msg);
                },
                onBlockedClick: function(data) {

                },
                onSelect: function(el, data, opts) {
                    var $tooltip = $('#gantt-select-info'),
                        template = $('#tooltip-select-template').html(),
                        leftPos = el.offset().left,
                        postData;

                    $.each(data, function() {
                        this.timeFrom = this.fromHour + ':' + this.fromMin;
                        this.timeTo = this.toHour + ':' + this.toMin;
                    });


                    if (data.leftPos < 0) {
                        leftPos = $('.gantt-vtheader').width();
                    } else if ($(window).width() - el.offset().left < el.width()) {
                        leftPos = $(window).width() - $('#gantt-select-info').width() - 5;
                    }

                    $('#gantt-overlay').css({
                        height: $(document).height()
                    }).show().on('click', function() {
                        $(this).hide();
                        el.removeClass('ui-selected');
                        $('#gantt-select-info').fadeOut();
                    });

                    $tooltip.html(_.template(template, { data: data })).css({
                        top: el.offset().top + el.height() + 3,
                        left: leftPos
                    }).fadeIn();


                    setTimeout(function() {
                        $('.js-block').on('click', function() {
                            var ganttView = $ganttView.data('jquery-gantt-view'),
                                postData = [],
                                idxArrayObj = {
                                    reserveIdx: [],
                                    releaseIdx: []
                                };

                            $('#gantt-select-info').hide();
                            $.each(data, function() {
                                postData.push({
                                    staff_id: this.staffId,
                                    task_id: this.taskId,
                                    from: this.fromHour + this.fromMin,
                                    to: this.toHour + this.toMin
                                });
                            });

                            $.ajax({
                                url: 'api/block.json',
                                // type: 'post',
                                data: {
                                    data: postData
                                },
                                timeout: 10000
                            }).done(function() {
                                el.addClass('blocked');

                                $.each(el, function() {
                                    var self = $(this),
                                        cellIdx = self.index(),
                                        rowIdx = self.parent().index('.gantt-grid-row'),
                                        isFlag = false;

                                    $.each(opts.blockTime, function() {
                                        if (this.rowIdx === rowIdx) {
                                            (this.timeIdxArray).push(cellIdx);
                                            isFlag = true;
                                        }
                                    });

                                    if (!isFlag) {
                                        (opts.blockTime).push({
                                            rowIdx: rowIdx,
                                            timeIdxArray: [cellIdx]
                                        });
                                    }
                                });

                                idxArrayObj.reserveIdx = data[0].idxArray;
                                for (i = 0; i < data.length; i++) {
                                    ganttView.updateCount(idxArrayObj);
                                }

                                $selected.removeClass('ui-selected');
                                $.colorbox.close();
                            }).fail(function() {
                                showErrModal('予期せぬエラーが発生しました。');
                                $selected.removeClass('ui-selected');
                            });
                        });

                        $('.js-book').on('click', function() {

                        });
                    }, 0);
                }
            }
        };

        /**
         * Initialize
         */
        $ganttView.ganttView(options);
        $datePicker.datepicker({
            showOn: 'button',
            buttonImage: 'js/lib/images/calendar.gif',
            buttonImageOnly: true,
            dateFormat: 'yy-mm-dd',
            dayNamesMin: ['日', '月', '火', '水', '木', '金', '土'],
            monthNames: ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'],
            numberOfMonths: [1, 2],
            beforeShowDay: function(date) {
                var i = 0;
                // 定休日
                if (date.getDay() == CONFIG.OFF_DATE) {
                    return [true, 'off'];
                }
                // 祝日の判定
                for(i; i < CONFIG.HOLIDAYS.length; i++) {
                    var htime = Date.parse(CONFIG.HOLIDAYS[i].date),
                        holiday = new Date();

                    holiday.setTime(htime);

                    if (holiday.getYear() == date.getYear() &&
                        holiday.getMonth() == date.getMonth() &&
                        holiday.getDate() == date.getDate()) {
                        return [true, 'holiday', CONFIG.HOLIDAYS[i].desc];
                    }
                }
                // 日曜日
                if (date.getDay() == 0) {
                    return [true, 'sunday'];
                }
                // 土曜日
                if (date.getDay() == 6) {
                    return [true, 'saturday'];
                }
                // 平日
                return [true, ''];
            },
            onSelect: function(dateTxt, obj) {
                var paramArray = dateTxt.split('-');
                    param = paramArray.join('');

                jumpPage(param);
            }
        });

        /**
         * EVENTS
         */
        $('.js-reset').on('click', function() {
            var ganttView = $ganttView.data('jquery-gantt-view'),
                $modal = $('.modal'),
                template = $('#modal-reset-template').html();

            $modal.html(_.template(template));
            openModal();

            setTimeout(function() {
                $modal.find('.js-exec').on('click', function() {
                    ganttView.options.reserveCountData = RESERVE_COUNT_DATA;
                    ganttView.refresh(ganttView.options);

                    $.colorbox.close();
                });
            }, 0);
        });

        $('.js-switch').on('click', function() {
            var ganttView = $ganttView.data('jquery-gantt-view'),
                btnTxt = (ganttView.options.compactView)? '縮小表示':'通常表示';

            ganttView.options.compactView = !ganttView.options.compactView;
            options.compactView = !options.compactView;

            ganttView.refresh(ganttView.options);

            $(this).text(btnTxt);
        });

        $('.js-check-all').on('click', function() {
            $('input[name=staff]').prop('checked', true);
        });

        $('.js-check-non').on('click', function() {
            $('input[name=staff]').prop('checked', false);
        });

        $('.js-filter').on('click', function() {
            var ganttView = $ganttView.data('jquery-gantt-view'),
                $checkbox = $('input[name=staff]:checked'),
                id;

            $.each(ganttView.options.data, function() {
                var self = this;

                self.dispFlag = false;

                $.each($checkbox, function() {
                    id = $(this).val() - 0;
                    
                    if (self.id === id) {
                        self.dispFlag = true;
                    }
                });
            });
            ganttView.refresh(ganttView.options);
        });

        $('.js-restore').on('click', function() {
            $('[data-user-id]').show();
        });


        /**
         * Jump to specific date page
         * @param  {String} target [target date (yyyymmdd)]
         */
        function jumpPage(target) {
            var param = (target)? '?data-date=' + target : '';

            location.href = file + param;
        }

        function openModal() {
            $.colorbox({
                inline: true,
                href: '.modal',
                width: 635,
                padding: 0,
                scrolling: false,
                opacity: 0.4,
                closeButton: false
            });
        }

        function showErrModal(msg, isOnExisting) {
            var $modal = $('.modal'),
                template = $('#modal-err-template').html();

            $modal.html(_.template(template, { errMsg: msg }));

            if (isOnExisting) {
                $.colorbox.resize();
            } else {
                setTimeout(function() {
                    openModal();
                }, 0);
            }
        }
    });

})(jQuery);