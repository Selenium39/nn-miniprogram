Page({
  data: {
    width: 0,
    height: 0,
    pieces: [],
    moves: 0,
    time: 0,
    gameStarted: false,
    imgLoaded: false,
    currentImageIndex: 0,
    // 默认图片路径数组
    defaultImages: [
      '/images/puzzle1.jpg',
      '/images/puzzle2.jpg',
      '/images/puzzle3.jpg'
    ]
  },

  onLoad: function () {
    // 获取系统信息设置画布大小
    const sysInfo = wx.getSystemInfoSync();
    const canvasSize = sysInfo.windowWidth - 40;
    this.setData({
      width: canvasSize,
      height: canvasSize
    });
    wx.nextTick(() => {
      this.initCanvas().then(() => {
        // Canvas初始化完成后加载第一张图片
        this.loadImage(this.data.defaultImages[0]);
      });
    });
  },

  // 初始化画布
  initCanvas: function () {
    return new Promise((resolve, reject) => {
      const query = wx.createSelectorQuery();
      query.select('#puzzleCanvas')
        .fields({
          node: true,
          size: true
        })
        .exec((res) => {
          if (res[0]) {
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

            resolve();
          } else {
            console.error('Canvas节点获取失败');
            reject(new Error('Canvas节点获取失败'));
          }
        });
    });
  },

  // 切换到下一张图片
  nextImage: function () {
    const nextIndex = (this.data.currentImageIndex + 1) % this.data.defaultImages.length;
    this.setData({
      currentImageIndex: nextIndex,
      imgLoaded: false,
      gameStarted: false,
      moves: 0,
      time: 0
    });
    this.stopTimer();
    this.loadImage(this.data.defaultImages[nextIndex]);
  },

  // 加载图片
  loadImage: async function (imgPath) {
    try {
      // 获取图片信息
      const imgInfo = await wx.getImageInfo({
        src: imgPath
      });

      // 创建离屏canvas处理图片
      const offCanvas = wx.createOffscreenCanvas({
        type: '2d',
        width: this.data.width,
        height: this.data.height
      });
      const offCtx = offCanvas.getContext('2d');

      // 加载图片
      const img = offCanvas.createImage();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imgPath;
      });

      // 绘制并裁剪成正方形
      const size = Math.min(img.width, img.height);
      const sx = (img.width - size) / 2;
      const sy = (img.height - size) / 2;

      offCtx.drawImage(img, sx, sy, size, size,
        0, 0, this.data.width, this.data.height);

      // 切分图片
      const pieceSize = this.data.width / 3;
      const pieces = [];

      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          const pieceCanvas = wx.createOffscreenCanvas({
            type: '2d',
            width: pieceSize,
            height: pieceSize
          });
          const pieceCtx = pieceCanvas.getContext('2d');

          const imageData = offCtx.getImageData(
            j * pieceSize, i * pieceSize,
            pieceSize, pieceSize
          );
          pieceCtx.putImageData(imageData, 0, 0);

          pieces.push({
            imageUrl: pieceCanvas.toDataURL(),
            currentPos: i * 3 + j,
            originalPos: i * 3 + j
          });
        }
      }

      this.setData({
        pieces: pieces,
        imgLoaded: true,
        gameStarted: false,
        moves: 0,
        time: 0
      });

      // 绘制完整拼图
      this.drawPuzzle();

    } catch (error) {
      console.error('加载图片失败:', error);
      wx.showToast({
        title: '加载图片失败',
        icon: 'none'
      });
    }
  },

  startGame: function () {
    const pieces = [...this.data.pieces];
    this.shufflePieces(pieces);

    this.setData({
      pieces: pieces,
      gameStarted: true,
      moves: 0,
      time: 0
    });

    this.drawPuzzle();
    this.startTimer();
  },

  drawPuzzle: function () {
    const ctx = this.ctx;
    const pieceSize = this.data.width / 3;

    ctx.clearRect(0, 0, this.data.width, this.data.height);

    this.data.pieces.forEach((piece, index) => {
      const row = Math.floor(piece.currentPos / 3);
      const col = piece.currentPos % 3;

      const img = this.canvas.createImage();
      img.onload = () => {
        ctx.drawImage(img,
          col * pieceSize, row * pieceSize,
          pieceSize, pieceSize
        );

        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(
          col * pieceSize, row * pieceSize,
          pieceSize, pieceSize
        );
      };
      img.src = piece.imageUrl;
    });
  },

  touchStart: function (e) {
    if (!this.data.gameStarted) return;

    const touch = e.touches[0];
    const pieceSize = this.data.width / 3;

    const col = Math.floor((touch.x - e.target.offsetLeft) / pieceSize);
    const row = Math.floor((touch.y - e.target.offsetTop) / pieceSize);
    const index = row * 3 + col;

    const touchedPieceIndex = this.data.pieces.findIndex(
      piece => piece.currentPos === index
    );

    if (touchedPieceIndex !== -1) {
      this.touchedPiece = touchedPieceIndex;
    }
  },

  touchMove: function (e) {
    // 不需要移动效果
  },

  touchEnd: function (e) {
    if (this.touchedPiece === null || this.touchedPiece === undefined) return;

    const touch = e.changedTouches[0];
    const pieceSize = this.data.width / 3;

    const col = Math.floor((touch.x - e.target.offsetLeft) / pieceSize);
    const row = Math.floor((touch.y - e.target.offsetTop) / pieceSize);
    const targetPos = row * 3 + col;

    const targetPieceIndex = this.data.pieces.findIndex(
      piece => piece.currentPos === targetPos
    );

    if (targetPieceIndex !== -1 &&
      this.canSwap(this.data.pieces[this.touchedPiece].currentPos, targetPos)) {
      this.swapPieces(this.touchedPiece, targetPieceIndex);
      this.setData({
        moves: this.data.moves + 1
      });

      if (this.checkWin()) {
        this.gameWin();
      }
    }

    this.touchedPiece = null;
  },

  canSwap: function (index1, index2) {
    const row1 = Math.floor(index1 / 3);
    const col1 = index1 % 3;
    const row2 = Math.floor(index2 / 3);
    const col2 = index2 % 3;

    return (Math.abs(row1 - row2) === 1 && col1 === col2) ||
      (Math.abs(col1 - col2) === 1 && row1 === row2);
  },

  swapPieces: function (index1, index2) {
    const pieces = this.data.pieces;
    const pos1 = pieces[index1].currentPos;
    const pos2 = pieces[index2].currentPos;

    pieces[index1].currentPos = pos2;
    pieces[index2].currentPos = pos1;

    this.setData({
      pieces: pieces
    });
    this.drawPuzzle();
  },

  shufflePieces: function (pieces) {
    for (let i = pieces.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = pieces[i].currentPos;
      pieces[i].currentPos = pieces[j].currentPos;
      pieces[j].currentPos = temp;
    }
  },

  checkWin: function () {
    return this.data.pieces.every(piece =>
      piece.currentPos === piece.originalPos);
  },

  gameWin: function () {
    this.stopTimer();
    wx.showModal({
      title: '恭喜完成',
      content: `用时${this.data.time}秒，移动${this.data.moves}步`,
      showCancel: false
    });
  },

  startTimer: function () {
    this.timer = setInterval(() => {
      this.setData({
        time: this.data.time + 1
      });
    }, 1000);
  },

  stopTimer: function () {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  },

  onUnload: function () {
    this.stopTimer();
  }
})