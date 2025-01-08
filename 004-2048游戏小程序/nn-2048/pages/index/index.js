Page({
  data: {
    board: [],
    score: 0,
    gameOver: false,
    isWin: false,
    boardSize: 4,
    touchStart: {
      x: 0,
      y: 0
    },
    showRules: false
  },

  onLoad() {
    this.initGame();
  },

  toggleRules() {
    this.setData({
      showRules: !this.data.showRules
    });
  },

  // 初始化游戏
  initGame() {
    const board = Array(this.data.boardSize).fill(0).map(() =>
      Array(this.data.boardSize).fill(0)
    );
    this.setData({
      board,
      score: 0,
      gameOver: false,
      isWin: false // 重置获胜状态
    });
    this.addNumber();
    this.addNumber();
  },

  // 在随机空位置添加数字(2或4)
  addNumber() {
    const available = [];
    for (let i = 0; i < this.data.boardSize; i++) {
      for (let j = 0; j < this.data.boardSize; j++) {
        if (this.data.board[i][j] === 0) {
          available.push({
            x: i,
            y: j
          });
        }
      }
    }
    if (available.length > 0) {
      const randomCell = available[Math.floor(Math.random() * available.length)];
      const newNumber = Math.random() < 0.9 ? 2 : 4;
      const newBoard = [...this.data.board];
      newBoard[randomCell.x][randomCell.y] = newNumber;
      this.setData({
        board: newBoard
      });
    }
  },

  // 处理触摸开始事件
  handleTouchStart(e) {
    const touch = e.touches[0];
    this.setData({
      touchStart: {
        x: touch.clientX,
        y: touch.clientY
      }
    });
  },

  // 处理触摸结束事件
  handleTouchEnd(e) {
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - this.data.touchStart.x;
    const deltaY = touch.clientY - this.data.touchStart.y;

    // 设置一个最小滑动距离，防止误触
    const minDistance = 10;

    // 判断滑动方向
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minDistance) {
      // 水平方向移动
      if (deltaX > 0) {
        this.move('right');
      } else {
        this.move('left');
      }
    } else if (Math.abs(deltaY) > minDistance) {
      // 垂直方向移动 - 注意这里改变了判断条件
      if (deltaY > 0) {
        // 手指向下滑动，应该触发向下移动
        this.move('down');
      } else {
        // 手指向上滑动，应该触发向上移动
        this.move('up');
      }
    }
  },

  // 移动并合并数字
  move(direction) {
    if (this.data.gameOver || this.data.isWin) return; // 获胜也停止移动

    const board = JSON.parse(JSON.stringify(this.data.board));
    let moved = false;
    let score = this.data.score;

    // 根据方向转换矩阵
    const rotateBoard = (board, times) => {
      let newBoard = JSON.parse(JSON.stringify(board));
      while (times-- > 0) {
        const rotated = Array(this.data.boardSize).fill(0)
          .map(() => Array(this.data.boardSize).fill(0));
        for (let i = 0; i < this.data.boardSize; i++) {
          for (let j = 0; j < this.data.boardSize; j++) {
            rotated[j][this.data.boardSize - 1 - i] = newBoard[i][j];
          }
        }
        newBoard = rotated;
      }
      return newBoard;
    };

    // 向左移动一行
    const moveLeft = (row) => {
      const newRow = row.filter(cell => cell !== 0);
      for (let i = 0; i < newRow.length - 1; i++) {
        if (newRow[i] === newRow[i + 1]) {
          newRow[i] *= 2;
          score += newRow[i];
          newRow.splice(i + 1, 1);
          // 检查是否达到2048
          if (newRow[i] === 2048) {
            this.setData({
              isWin: true
            });
          }
        }
      }
      while (newRow.length < this.data.boardSize) {
        newRow.push(0);
      }
      return newRow;
    };

    // 根据方向旋转棋盘
    let rotationTimes = {
      'left': 0,
      'up': 3,
      'right': 2,
      'down': 1
    } [direction];

    let newBoard = rotateBoard(board, rotationTimes);

    // 移动每一行
    for (let i = 0; i < this.data.boardSize; i++) {
      const oldRow = [...newBoard[i]];
      const newRow = moveLeft(oldRow);
      if (JSON.stringify(oldRow) !== JSON.stringify(newRow)) {
        moved = true;
      }
      newBoard[i] = newRow;
    }

    // 旋转回原始方向
    newBoard = rotateBoard(newBoard, (4 - rotationTimes) % 4);

    if (moved) {
      this.setData({
        board: newBoard,
        score
      });
      if (!this.data.isWin) {
        this.addNumber();
        if (this.isGameOver()) {
          this.setData({
            gameOver: true
          });
        }
      }
    }
  },

  // 检查游戏是否结束
  isGameOver() {
    // 检查是否有空格
    for (let i = 0; i < this.data.boardSize; i++) {
      for (let j = 0; j < this.data.boardSize; j++) {
        if (this.data.board[i][j] === 0) return false;
      }
    }

    // 检查是否可以合并
    for (let i = 0; i < this.data.boardSize; i++) {
      for (let j = 0; j < this.data.boardSize - 1; j++) {
        if (this.data.board[i][j] === this.data.board[i][j + 1]) return false;
        if (this.data.board[j][i] === this.data.board[j + 1][i]) return false;
      }
    }

    return true;
  },

  // 重新开始游戏
  restart() {
    this.initGame();
  }
});