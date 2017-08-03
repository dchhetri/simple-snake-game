function App(options) {
    this.options = options || {};
    this.mergeDefaults(options);
    this.canvas = document.getElementById( this.options.canvasId );
    this.canvasCtx = this.canvas.getContext('2d');
    
    this.constants = {
        cellTypes: {
            empty: { 
                name: 'empty', 
                strokeStyle: 'gray',
                fillStyle: 'black',
            },
            player: {
                name: 'player',
                strokeStyle: 'gray',
                fillStyle: 'navy',
            },
            wall: {
                name: 'wall'
            }, 

            food: {
                name: 'food',
                strokeStyle: 'white',
                fillStyle: 'green'
            }
        },
        directions: {
            up: 'up',
            right: 'right',
            down: 'down',
            left: 'left',
        }
    };

    this.initialize();
}

App.prototype.mergeDefaults = function(options) {
    return _.defaults(options, {
        boxSize: 10
    });
}

App.prototype.initialize = function() {
    this.registerKeyboardListener();
    this.normalizeCanvasSizeToClientSize();
    this.createGridModel();
    this.createRandomPlayerStartPoint(this.gridModel);
    this.populateGridWithRandomFood(this.gridModel);
    this.render();
}

App.prototype.normalizeCanvasSizeToClientSize = function() {
    this.canvas.width = this.canvas.clientWidth;
    this.canvas.height = this.canvas.clientHeight;
}

App.prototype.createGridModel = function() {
    var that = this;
    var gridSize = this.canvas.width / this.options.boxSize;
    var gridModel = [];

    //create grid model
    _.times(gridSize, function(row) {
        gridModel[row] = [];
        _.times(gridSize, function(col) {
            gridModel[row][col] = that.createGridCellModel(row, col);
        })
    });

    //save grid model
    this.gridModel = gridModel;
};

App.prototype.createGridCellModel = function(row, col) {
    return {
        row: row,
        col: col,
        width: this.options.boxSize,
        height: this.options.boxSize,
        type: this.constants.cellTypes.empty,
        tail: [],
    };
}

App.prototype.createRandomPlayerStartPoint = function(gridModel) {
    var gridSize = this.canvas.width / this.options.boxSize;
    var row = this.getRandomInt(gridSize/4, 3*gridSize/4);
    var col = this.getRandomInt(gridSize/4, 3*gridSize/4);
    
    this.player = gridModel[row][col];
    this.player.type = this.constants.cellTypes.player;
    this.player.direction = this.constants.directions.right;
    this.player.tail = [];
}

App.prototype.populateGridWithRandomFood = function(gridModel) {
    var freeSpaces = [];
    var that = this;
    
    gridModel.forEach(function(row) {
        row.forEach(function (cell) {
            if (cell.type === that.constants.cellTypes.empty) {
                freeSpaces.push(cell);
            }
        });
    });

    if (freeSpaces.length === 0) {
        return false;
    }else {
        var randomIndex = this.getRandomInt(0, freeSpaces.length);
        freeSpaces[randomIndex].type = that.constants.cellTypes.food;
        return true;
    }
};

App.prototype.render = function() {
    this._startAnimationLoop(this._renderFrame.bind(this));   
}

App.prototype._startAnimationLoop = function(renderFunc) {
    var fps = 10;
    var then = Date.now();
    var interval = 1000/fps;
    
    (function draw(){
        var ID = requestAnimationFrame(draw);
        var now = Date.now();
        var delta = now - then;            
        if (delta > interval) {
            then = now - (delta % interval);
            renderFunc();
            cancelAnimationFrame(ID);
        }
    })();
};

App.prototype._renderFrame = function() {
    //move player to next direction on every tick. 
    this.movePlayer();

    //render state
    this.renderGrid(this.gridModel);
}
App.prototype.renderGrid = function(gridModel) {
    var that = this;
    gridModel.forEach( function(rowModel) {
        rowModel.forEach( function(cellModel) {
            that.renderCell(cellModel);
        });
    });
}

App.prototype.renderCell = function(cellModel) {
    var cellTypes = this.constants.cellTypes;
    var x = cellModel.col * this.options.boxSize;
    var y = cellModel.row * this.options.boxSize;

    switch(cellModel.type) {
        case cellTypes.empty: {
            this.canvasCtx.strokeStyle = cellTypes.empty.strokeStyle;
            this.canvasCtx.fillStyle = cellTypes.empty.fillStyle;

            this.canvasCtx.strokeRect(x, y, cellModel.width, cellModel.height);
            this.canvasCtx.fillRect(x, y, cellModel.width, cellModel.height);
            break;
        }
        case cellTypes.player: {
            this.canvasCtx.fillStyle = cellTypes.player.strokeStyle;
            this.canvasCtx.fillStyle = cellTypes.player.fillStyle;
            this.canvasCtx.fillRect(x, y, cellModel.width, cellModel.height);
            break;
        }
        case cellTypes.food: {
            this.canvasCtx.fillStyle = cellTypes.food.strokeStyle;
            this.canvasCtx.fillStyle = cellTypes.food.fillStyle;
            this.canvasCtx.fillRect(x, y, cellModel.width, cellModel.height);
            break;
        }
    }
}

App.prototype.movePlayer = function() {
    var nextMoveState = this.getPlayerMoveState();
    var nextCell = nextMoveState.nextCell;

    switch(nextCell.type) {
        //move into empty cell
        case this.constants.cellTypes.empty: {
            this._movePlayer(nextCell);
            break;
        }

        //moving into a tail cell
        case this.constants.cellTypes.player: {
            this.onSelfCollision(nextCell);
            break;
        }

        //moving into a food cell
        case this.constants.cellTypes.food: {
            this.onFoodCollision(nextCell)
        }
    } 

}
App.prototype._movePlayer = function(nextCell) {
    var prevHeadCell = this.player;
    var newHeadCell = this.gridModel[nextCell.row][nextCell.col];

    //move head to next position
    this.player = newHeadCell;
    this.player.type = this.constants.cellTypes.player;
    this.player.direction = prevHeadCell.direction;
    this.player.tail = prevHeadCell.tail;
    
    //move tail if any
    if (this.player.tail.length) {
        var lastTail = this.player.tail.pop();
        this.player.tail.unshift(prevHeadCell);
        lastTail.type = this.constants.cellTypes.empty;
    }else {
        //else clear out old head cell
        prevHeadCell.type = this.constants.cellTypes.empty;
    }
};

App.prototype.onSelfCollision = function() {
    console.log('onSelfCollision');
};

App.prototype.onFoodCollision = function(nextCell) {
    var lastTail = _.last(this.player.tail) || this.player; 
    //move to next cell
    this._movePlayer(nextCell);
    //but also add tail assuring its body cell type
    lastTail.type = this.constants.cellTypes.player;
    this.player.tail.push(lastTail);

    this.populateGridWithRandomFood(this.gridModel);
};

App.prototype.getPlayerMoveState = function() {
    var direction = this.player.direction;
    var state = {};

    if (direction === this.constants.directions.right) {
        state = this.getStateIfMovingTowards(
            this.gridModel,
            this.player,
            this.player.row,
            this.player.col + 1
        );
    }else if(direction === this.constants.directions.left) {
        state = this.getStateIfMovingTowards(
            this.gridModel,
            this.player,
            this.player.row,
            this.player.col - 1
        );
    }else if(direction === this.constants.directions.up) {
         state = this.getStateIfMovingTowards(
            this.gridModel,
            this.player,
            this.player.row - 1,
            this.player.col
        );
    }else { //down
        state = this.getStateIfMovingTowards(
            this.gridModel,
            this.player,
            this.player.row + 1,
            this.player.col
        );
    }

    return state;
};

App.prototype.getStateIfMovingTowards = function(gridModel, player, toRow, toCol) {
    var state = {};

    var isColumnInRange = 0 <= toCol && toCol < gridModel[player.row].length;
    var isRowInRange = 0 <= toRow && toRow < gridModel.length;
    //if wall colision state it
    if (!isColumnInRange || !isRowInRange ) {
        state.hasCollided = true;
        state.nextCell = this.constants.cellTypes.wall;
    }else {
        //else return state where hasCollided is only true if not empty cell
        var moveToCell = gridModel[toRow][toCol];
        state.hasCollided = moveToCell.type !== this.constants.cellTypes.empty;
        state.nextCell = moveToCell;
    }

    return state;
};

App.prototype.registerKeyboardListener = function() {
    var that = this;
    var keyCodeToDirectionMap = {
        37: this.constants.directions.left,
        38: this.constants.directions.up,
        39: this.constants.directions.right,
        40: this.constants.directions.down,
    };

    document.addEventListener('keydown', function(event) {
        var direction = keyCodeToDirectionMap[event.which];
        that.player.direction = direction || that.player.direction;
    });
};

App.prototype.getRandomInt = function(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}