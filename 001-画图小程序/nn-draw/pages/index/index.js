Page({
  data: {
    pen: 10, // 画笔粗细默认值
    r: 255, // 红色值
    g: 0, // 绿色值
    b: 0, // 蓝色值
    color: 'rgb(255, 0, 0)', // 画笔颜色默认值
    showSettings: false, // 是否显示设置面板
    settingType: '', // 当前设置类型
    width: 0, // 画布宽度
    height: 0 // 画布高度
  },

  onLoad: function () {
    // 获取系统信息
    const sysInfo = wx.getSystemInfoSync();
    // 获取画布的宽高
    this.setData({
      width: sysInfo.windowWidth,
      height: sysInfo.windowHeight - 100 // 减去工具栏高度
    });

    // 初始化Canvas
    this.initCanvas();
  },

  // 初始化Canvas
  initCanvas: function () {
    const query = wx.createSelectorQuery();
    query.select('#myCanvas')
      .fields({
        node: true,
        size: true
      })
      .exec((res) => {
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');

        // 保存canvas和context引用
        this.canvas = canvas;
        this.ctx = ctx;

        // 设置画布大小
        const dpr = wx.getWindowInfo().pixelRatio;
        canvas.width = this.data.width * dpr;
        canvas.height = this.data.height * dpr;
        ctx.scale(dpr, dpr);

        // 设置默认样式
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      });
  },

  startX: 0, // 保存X坐标轴变量
  startY: 0, // 保存Y坐标轴变量
  isClear: false, // 是否启用橡皮擦标记

  // 手指触摸动作开始
  touchStart: function (e) {
    this.startX = e.changedTouches[0].x;
    this.startY = e.changedTouches[0].y;

    if (this.isClear) {
      this.ctx.strokeStyle = '#FFFFFF';
      this.ctx.lineWidth = 20;
      this.ctx.beginPath();
      this.ctx.arc(this.startX, this.startY, 5, 0, 2 * Math.PI, true);
      this.ctx.fill();
    } else {
      this.ctx.strokeStyle = this.data.color;
      this.ctx.lineWidth = this.data.pen;
      this.ctx.beginPath();
      this.ctx.moveTo(this.startX, this.startY);
    }
  },

  // 手指触摸后移动
  touchMove: function (e) {
    const currentX = e.changedTouches[0].x;
    const currentY = e.changedTouches[0].y;

    if (this.isClear) {
      this.ctx.moveTo(this.startX, this.startY);
      this.ctx.lineTo(currentX, currentY);
      this.ctx.stroke();
    } else {
      this.ctx.lineTo(currentX, currentY);
      this.ctx.stroke();
    }

    this.startX = currentX;
    this.startY = currentY;
  },

  // 手指触摸动作结束
  touchEnd: function () {
    this.ctx.closePath();
  },

  // 切换画笔粗细设置
  toggleSizeSettings() {
    if (this.isClear) {
      this.isClear = false;
      wx.showToast({
        title: '已切换为画笔',
        icon: 'none',
        duration: 1000
      });
      return
    }
    this.setData({
      showSettings: !this.data.showSettings || this.data.settingType !== 'size',
      settingType: this.data.settingType === 'size' ? '' : 'size'
    });
  },

  // 切换颜色设置
  toggleColorSettings() {
    if (this.isClear) {
      wx.showToast({
        title: '请先切换为画笔模式',
        icon: 'none',
        duration: 1500
      });
      return;
    }
    this.setData({
      showSettings: !this.data.showSettings || this.data.settingType !== 'color',
      settingType: this.data.settingType === 'color' ? '' : 'color'
    });
  },

  // RGB颜色调节
  changeRed(e) {
    this.setData({
      r: e.detail.value
    });
    this.updateColor();
  },

  changeGreen(e) {
    this.setData({
      g: e.detail.value
    });
    this.updateColor();
  },

  changeBlue(e) {
    this.setData({
      b: e.detail.value
    });
    this.updateColor();
  },

  // 更新颜色
  updateColor() {
    const color = `rgb(${this.data.r},${this.data.g},${this.data.b})`;
    this.setData({
      color
    });
    this.isClear = false;
  },

  // 设置画笔大小
  penSelect: function (e) {
    this.setData({
      pen: parseInt(e.detail.value)
    });
    this.isClear = false;
  },

  // 启用或关闭橡皮擦
  clearCanvas: function () {
    this.isClear = !this.isClear;
    // 显示提示
    wx.showToast({
      title: this.isClear ? '已启用橡皮擦' : '已启用画笔',
      icon: 'none',
      duration: 1000
    });
  },

  // 选择预设颜色
  selectPresetColor: function (e) {
    const colorArray = e.currentTarget.dataset.color.split(',');
    const r = parseInt(colorArray[0]);
    const g = parseInt(colorArray[1]);
    const b = parseInt(colorArray[2]);

    this.setData({
      r: r,
      g: g,
      b: b,
      color: `rgb(${r},${g},${b})`
    });
    this.isClear = false;
  },
  getWritePhotosAlbum: function (callback) {
    wx.getSetting({
      success: res => {
        console.log('res=', res);
        if (res.authSetting['scope.writePhotosAlbum']) {
          console.log('true');
          callback && callback();
        } else if (res.authSetting['scope.writePhotosAlbum'] === undefined) {
          wx.showModal({
            title: '提示',
            content: '您未开启保存图片到相册的权限，请点击确定去开启权限！',
            success: (res) => {
              if (res.confirm) {
                wx.authorize({
                  scope: 'scope.writePhotosAlbum',
                  success: (res) => {
                    callback && callback()
                    console.log('授权下载成功', res);
                  },
                  fail: (res) => {
                    console.log('您没有授权 fail=', res);
                    wx.showToast({
                      title: '您没有授权，无法保存到相册',
                      icon: 'none'
                    });
                  }
                });
              } else {
                console.log('取消了');
              }
            }
          });
        } else {
          wx.showModal({
            title: '提示',
            content: '您未开启保存图片到相册的权限，请点击确定去开启权限！',
            success: (res) => {
              if (res.confirm) {
                wx.openSetting({
                  success: (res) => {
                    wx.showToast({
                      icon: 'none',
                      title: '正在保存图片',
                    });
                    if (res.authSetting['scope.writePhotosAlbum']) {
                      console.log('false success res=', res);
                      callback && callback();
                    } else {
                      wx.showToast({
                        title: '您没有授权，无法保存到相册！',
                        icon: 'none'
                      });
                    }
                  },
                  fail: (res) => {
                    console.log('false file res=', res);
                  }
                });
              } else {
                wx.showToast({
                  title: '您没有授权，无法保存到相册',
                  icon: 'none'
                });
              }
            }
          });
        }
      }
    });
  },

  // 分享图片
  shareImage: function () {
    var that = this;
    wx.canvasToTempFilePath({
      canvas: this.canvas,
      success: function (res) {
        const tempFilePath = res.tempFilePath;
        let callback = function () {
          wx.showShareImageMenu({
            path: tempFilePath
          });
        }
        that.getWritePhotosAlbum(callback);
      },
      fail: function (err) {
        wx.showToast({
          title: '生成图片失败',
          icon: 'none'
        });
      }
    });
  }
});