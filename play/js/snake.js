// cheat plugin interface
var Cheat;

// snake game logic
const Snake = (function() { 

    "use strict";

    // CONSTANTS (defaults for mobile) //
    var SPEED = 200;            // milliseconds between update. 
    var SIZE = 15;              // block size
    var LENGTH = 5;             // length of the snake initially

    var DESKTOP_SPEED = 100;
    var DESKTOP_SIZE = 20;

    var current_speed;              // to know current speed
    var hideSpeedTimer;             // timer
    var SHOWING_SPEED = 1000;       // milliseconds

    var TIME_DOUBLE_SPEED = 1000; // milliseconds
    var MAX_FOOD_COUNT = 10;

    var DESKTOP_CHEAT = "up,left,down,left,right,right,right";
    var MOBILE_CHEAT = "up left,down left,down right,down left,up right,up right,up right";

    var DESKTOP_SIDELOADER = "down,up,down,left,right,down,down";
    var MOBILE_SIDELOADER = "down right,up left,down right,down left,up right,down right,down right";

    var running;                // if a game has been started
    var set;                    // if a game is ready
    var turned;                 // to keep from turning more than once per update

    var cheatEnabled;           // is the cheat function active
    var history;                // button history to enable cheat

    var score;                  // current score user
    var score_enemy;            // current score enemy

    var width;                  // number of tiles across
    var height;                 // number of tiles top to bottom

    var positions;              // 2D array to keep track of positions. 0 = blank, 1 = obstacle, 2 = food

    var loopPlayer;                   // interval loop object for Player
    var loopEnemy;                   // interval loop object for Enemy

    var doubleSpeed;

    var foods;                     // array for food

    var snakes;                 // array for all snakes

    var snakes_count = 6;        // count of snakes

    var enemy_mind = .8;        // if random < enemy_mind then enemy moves to food

    //var direction;              // direction to update in
    //var blocks;

    //var tail;                   // pointer to the tail block
    //var head;                   // pointer to head block
    
    var moves = [
        {x: -1, y: 0},      // left
        {x: 0, y: -1},      // up
        {x: 1, y: 0},       // right
        {x: 0, y: 1}        // down
    ];

    function update(num) {
        var theSnake = snakes[num];
        // execute cheat
        if (cheatEnabled) {
            // validate the cheat method
            if (Cheat && typeof(Cheat.cheat) == "function") {
                var new_direction = Cheat.cheat();      // execute cheat

                // validate returned direction
                if (new_direction &&                                                                            // direction exists
                    typeof(new_direction.x) == "number" && new_direction.x >= -1 && new_direction.x <= 1 &&     // x is a number between -1 and 1
                    typeof(new_direction.y) == "number" && new_direction.y >= -1 && new_direction.y <= 1 &&     // y is a number between -1 and 1
                    (Math.abs(new_direction.x) + Math.abs(new_direction.y) == 1) &&                             // not a diagonal move or no move
                    !(new_direction.x == 0 && theSnake.direction.x == 0) &&                                              // not a 180
                    !(new_direction.y == 0 && theSnake.direction.y == 0) ) {
                    theSnake.direction = new_direction;
                }
            }
            else {
                // disable cheat
                cheatEnabled = false;
                $("#board").removeClass("red-border");
                $(".button").removeClass("red-border");
            }
        }

        if(num > 0  && Math.random() < enemy_mind) {
            if (CheatEnemy && typeof(CheatEnemy.cheat) == "function") {
                var new_direction = CheatEnemy.cheat(num);      // execute cheat

                // validate returned direction
                if (new_direction &&                                                                            // direction exists
                    typeof(new_direction.x) == "number" && new_direction.x >= -1 && new_direction.x <= 1 &&     // x is a number between -1 and 1
                    typeof(new_direction.y) == "number" && new_direction.y >= -1 && new_direction.y <= 1 &&     // y is a number between -1 and 1
                    (Math.abs(new_direction.x) + Math.abs(new_direction.y) == 1) &&                             // not a diagonal move or no move
                    !(new_direction.x == 0 && theSnake.direction.x == 0) &&                                              // not a 180
                    !(new_direction.y == 0 && theSnake.direction.y == 0) ) {
                    theSnake.direction = new_direction;
                }
            }
        }

        if(theSnake.turnBackFlag) {
            theSnake.turnBackFlag = false;
            turnBack(theSnake);
        }

        // set new position
        var x = theSnake.head.x + theSnake.direction.x;
        var y = theSnake.head.y + theSnake.direction.y;

        // check position
        var check = checkPosition(x, y);
        if (check == 1) {                   // hit something
            if(num == 0) {
                gameOver();
                return;
            } 
            else {
                dieSnake(theSnake);
                enemy_mind += (snakes_count > 1) ? .2/(snakes_count-1) : .2;
                snakes[num] = null;
                return;
            }
        }
        else if (check == 2) {              // hit food
            if(num > 0) {
                score_enemy++;
            }
            else {
                score++;
            }
            createBlock(theSnake,0,0)
            findFoodUnderHead(theSnake, x, y);
        }

        updateBoard(theSnake, x, y);

    }

    function updatePlayer() {
        update(0);
    }

    function updateEnemy() {
        for (var num = 1; num < snakes_count; num++) {
            if (snakes[num] == null) continue;
                update(num);
        }
    }

    function updateBoard(theSnake, x, y) {
        // move tail block to front
        positions[theSnake.tail.x][theSnake.tail.y] = 0;
        positions[x][y] = 1;
        moveTo(theSnake.tail, x, y);

        $(theSnake.head).removeClass('head');
        // update linked list
        theSnake.head.next = theSnake.tail;
        theSnake.head = theSnake.tail;
        theSnake.tail = theSnake.tail.next;

        $(theSnake.head).addClass('head');

        theSnake.blocks.unshift(theSnake.blocks.pop());

        turned = false;
    }

    function beginDoubleSpeed() {
        if(doubleSpeed == null) {
            loseTail(snakes[0]);
            window.clearInterval(loopPlayer);
            current_speed = SPEED/2;
            loopPlayer = setInterval(updatePlayer, current_speed);
            doubleSpeed = setTimeout(endDoubleSpeed, TIME_DOUBLE_SPEED);
        }
    }

    function endDoubleSpeed() {
        window.clearInterval(loopPlayer);
        if(running) {
            current_speed = SPEED;
            loopPlayer = setInterval(updatePlayer, current_speed);
        }
        doubleSpeed = null;
    }

    function controlSpeed(key) {
        window.clearInterval(loopPlayer);
        window.clearInterval(loopEnemy);
        if(key >= 48 && key <= 57 ) {
            key = (key == 48)? 10 : key - 48;
            current_speed = SPEED*key;
            loopPlayer = setInterval(updatePlayer, current_speed);
            loopEnemy = setInterval(updateEnemy, current_speed);
        }
        else if(key >= 96 && key <= 105 ) {
            key = key - 96;
            current_speed = SPEED - SPEED/10*key;
            loopPlayer = setInterval(updatePlayer, current_speed);
            loopEnemy = setInterval(updateEnemy, SPEED);
        }
        else {
            switch(key) {
                case 189: // -
                    current_speed = current_speed + 10;
                    loopEnemy = setInterval(updateEnemy, current_speed);
                    break;
                case 187: // =
                    current_speed = current_speed - 10;
                    loopEnemy = setInterval(updateEnemy, current_speed);
                    break;
                case 109: // Num-
                    current_speed = current_speed + 10;
                    loopEnemy = setInterval(updateEnemy, SPEED);
                    break;
                case 107: // Num+
                    current_speed = current_speed - 10;
                    loopEnemy = setInterval(updateEnemy, SPEED);
                    break;
            }
            loopPlayer = setInterval(updatePlayer, current_speed);
        }
        showSpeed(current_speed);
    }

    function showSpeed(theSpeed) {
        $("#speed").empty().append(theSpeed + " milliseconds");
        $(".block").css("zIndex", 0);
        $("#speed").css("zIndex", 2);
        $("#speed").show();
        hideSpeedTimer = setTimeout(hideSpeed, SHOWING_SPEED);
    }

    function hideSpeed() {
        $("#speed").empty();
        $("#speed").hide();
    }

    function createFood() {
        var food = document.createElement("div");
        food.className = "block food";
        $(food).css("height", SIZE);
        $(food).css("width", SIZE);
        placeFood(food);
        foods.push(food);
        $("#board").append(food);
    }

    function placeFood(food) {
        var x = Math.floor(width * Math.random());
        var y = Math.floor(height * Math.random());

        if (positions[x][y] == 0) {
            placeFoodTo(food, x, y);
        }
        else placeFood(food);
    }

    function placeFoodTo(food, x, y) {
        moveTo(food, x, y);
        positions[x][y] = 2;
    }

    function findFoodUnderHead(theSnake, x, y) {
        //var foods = document.getElementsByClassName("food");
        for (var i = 0; i < foods.length; i++) {
            if(x == foods[i].x && y == foods[i].y) {
                if(foods.length > MAX_FOOD_COUNT) {
                    var delFood = foods.splice(i, 1);
                    $(delFood).remove();
                }
                else {
                    placeFood(foods[i]);
                }
            }
            
        }
    }

    function gameOver() {
        stopGame();
        $("#message").empty().append(score + " : " + score_enemy);
        $(".block").css("zIndex", 0);
        $("#message").css("zIndex", 1);
        $("#message").show();
        set = false;
    }

    function checkPosition(x, y) {
        // check to see if it's in the box
        if (x < 0 || x >= width || y < 0 || y >= height) return 1;

        // check to see if it hit it's tail or the food
        return positions[x][y];
    }

    function moveTo(block, x, y) {
        $(block).css("top", y * SIZE + "px");
        $(block).css("left", x * SIZE + "px");
        block.x = x;
        block.y = y;
    }

    function loseTail(theSnake) {
        $(theSnake.tail).addClass('food');
        foods.push(theSnake.tail);
        positions[theSnake.tail.x][theSnake.tail.y] = 2;
        theSnake.tail = theSnake.tail.next;
        theSnake.blocks.pop();
    }

    function createBlock(theSnake, x, y, head) {
        var block = document.createElement("div");
        block.className = "block";
        if(head) block.className += " head";
        $(block).css("height", SIZE);
        $(block).css("width", SIZE);

        moveTo(block, x, y);                            // position the block
        block.x = x;
        block.y = y;
        positions[x][y] = 1;

        block.next = theSnake.tail;                              // update linked list
        theSnake.tail = block;

        theSnake.blocks.push(block);
        $("#board").append(block);
    }

    function shuffle(array) {
        var currentIndex = array.length, temporaryValue, randomIndex;

        // While there remain elements to shuffle...
        while (0 !== currentIndex) {
            // Pick a remaining element...
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex -= 1;

            // And swap it with the current element.
            temporaryValue = array[currentIndex];
            array[currentIndex] = array[randomIndex];
            array[randomIndex] = temporaryValue;
        }

        return array;
    }

    function dieSnake(theSnake) {
        $(theSnake.head).removeClass('head');
        
        for (var ib = 0; ib < theSnake.blocks.length; ib++) {
            
            var theBlock = theSnake.blocks[ib];
            positions[theBlock.x][theBlock.y] = 0;
            
            if(ib % 2 == 0) {
                spreadBlock(theBlock);
            }
            else {
                $(theBlock).remove();
            }
        }
    }

    function spreadBlock(theBlock) {
        shuffle(moves);
        moves.push({x: 0, y: 0});
        for (var i = 0; i < moves.length; i++) {
            var new_pos = {x: theBlock.x + moves[i].x, y: theBlock.y + moves[i].y};
            if (new_pos.x < 0 || new_pos.x >= width || new_pos.y < 0 || new_pos.y >= height) continue;
            if(positions[new_pos.x][new_pos.y] == 0) {
                $(theBlock).addClass('food');
                foods.push(theBlock);
                moveTo(theBlock, new_pos.x, new_pos.y)
                positions[new_pos.x][new_pos.y] = 2;
                break;
            }
        }
        moves.pop({x: 0, y: 0});
    }

    function turnBack(theSnake) {
        $(theSnake.head).removeClass('head');
        $(theSnake.tail).addClass('head');
        

        if(theSnake.blocks.length > 1) {
            theSnake.direction = { x: theSnake.tail.x - theSnake.tail.next.x, y: theSnake.tail.y - theSnake.tail.next.y };
        }
        else {
            theSnake.direction = { x: -theSnake.direction.x, y: -theSnake.direction.y };
        }

        theSnake.tail = theSnake.head;
        theSnake.head = theSnake.head.next;
        
        for (var i = 0; i < theSnake.blocks.length; i++) {
            theSnake.blocks[i].next = (i < theSnake.blocks.length-1) ? theSnake.blocks[i+1] : theSnake.blocks[0];
        }

        theSnake.blocks.reverse();
        
    }

    function startGame() {
        // start update loop
        current_speed = SPEED;
        loopPlayer = setInterval(updatePlayer, current_speed);
        loopEnemy = setInterval(updateEnemy, current_speed);
        running = true;
    }

    function stopGame() {
        window.clearInterval(loopPlayer);
        window.clearInterval(loopEnemy);
        running = false;
    }

    function left(theSnake) {
        theSnake.direction = {x: -1, y: 0};
    }

    function right(theSnake) {
        theSnake.direction = {x: 1, y: 0};
    }

    function up(theSnake) {
        theSnake.direction = {x: 0, y: -1};
    }

    function down(theSnake) {
        theSnake.direction = {x: 0, y: 1};
    }

    function pause() {
        //console.log(set, running);
        if (!set) {
            setup();
        }
        else if (set && !running) {
            startGame();
        }
        else if (set && running) {
            stopGame();
        }
    }

    function enableCheat() {
        if (Cheat) {
            if (cheatEnabled) {
                // disable cheat
                cheatEnabled = false;
                $("#board").removeClass("red-border");
                $(".button").removeClass("red-border");
            }
            else {
                // enable cheat
                cheatEnabled = true;
                $("#board").addClass("red-border");
                $(".button").addClass("red-border");
            }
        }
    }

    function enableSideloader() {
        if (running) pause();
        if (Sideloader.visible()) {
            Sideloader.hide();

            // set timeout to avoid double click
            setTimeout(function() {
                // initiate touchscreen listener
                $(document).click(function(e) {tapHandler(e);});
            }, 10);
        }
        else {
            Sideloader.show();
            // initiate touchscreen listener
            $(document).unbind("click");
        }
    }

    function keyHandler(e) {
        //console.log(e.keyCode);
        //
        var theSnake = snakes[0];

        if (e.keyCode == 37) history.add("left");
        else if (e.keyCode == 38) history.add("up");
        else if (e.keyCode == 39) history.add("right");
        else if (e.keyCode == 40) history.add("down");
        else history.add("");

        // check cheat
        if (history.toString() == DESKTOP_CHEAT) enableCheat();

        // check sideloader
        if (history.toString() == DESKTOP_SIDELOADER) enableSideloader();

        // arrow keys
        if (running && !turned) {
            if (e.keyCode == 37 && theSnake.direction.y != 0) left(theSnake);
            else if (e.keyCode == 38 && theSnake.direction.x != 0) up(theSnake);
            else if (e.keyCode == 39 && theSnake.direction.y != 0) right(theSnake);
            else if (e.keyCode == 40 && theSnake.direction.x != 0) down(theSnake);
            else {}
            turned = true;
        }
        
        if(!Sideloader.visible()){
            
        if (running && (e.keyCode >= 48 && e.keyCode <= 57 || e.keyCode >= 96 && e.keyCode <= 105)) controlSpeed(e.keyCode);

            // space bar
            switch (e.keyCode) {
              case 189:
              case 187:
              case 109:
              case 107:
                if(running) controlSpeed(e.keyCode);
                break;
              case 32:
                if(!running) {
                    pause();
                }
                else {
                    beginDoubleSpeed();
                }
                break;
              case 13:
                pause();
                break;
              case 88:
                if (!theSnake.turnBackFlag) theSnake.turnBackFlag = true;
                break;
              default:
            }
        } 
    }

    function tapHandler(e) {
        //console.log(e.target);
        var theSnake = snakes[0];
        // determine which key
        var key = "pane";
        if (e.target == document.getElementById("top-left")) key = "up left";
        else if (e.target == document.getElementById("bottom-left")) key = "down left";
        else if (e.target == document.getElementById("top-right")) key = "up right";
        else if (e.target == document.getElementById("bottom-right")) key = "down right";

        // check cheat
        history.add(key);
        if (history.toString() == MOBILE_CHEAT) enableCheat();

        // check sideloader
        if (history.toString() == MOBILE_SIDELOADER) enableSideloader();

        // arrows
        if (running && !turned) {
            if (new RegExp("left").test(key) && theSnake.direction.y != 0) left(theSnake);
            else if (new RegExp("up").test(key) && theSnake.direction.x != 0) up(theSnake);
            else if (new RegExp("right").test(key) && theSnake.direction.y != 0) right(theSnake);
            else if (new RegExp("down").test(key) && theSnake.direction.x != 0) down(theSnake);
            else {}
            turned = true;
        }

        // pause
        if (new RegExp("pane").test(key)) {
            if (!Sideloader.visible()) pause();
        }
    }

    function resizeWindow() {
        var landscape = window.matchMedia("(orientation: landscape)").matches;
        var desktop = window.matchMedia("(min-device-width: 992px)").matches;

        // set constants
        if (desktop) {
            SPEED = DESKTOP_SPEED;
            SIZE = DESKTOP_SIZE;
            current_speed = SPEED;
        }

        var percent_x = 1;
        var percent_y = 0.7;

        if (desktop) percent_y = 1;
        else if (landscape) {
            percent_x = 0.7;
            percent_y = 1;
        }

        var windowWidth = window.innerWidth * percent_x;
        var windowHeight = window.innerHeight * percent_y;

        $("#board").css("height", Math.floor(windowHeight / SIZE) * SIZE);
        $("#board").css("margin-top", (Math.floor(windowHeight / SIZE) * SIZE) / -2);
        $("#board").css("width", Math.floor(windowWidth / SIZE) * SIZE);
        $("#board").css("margin-left", (Math.floor(windowWidth / SIZE) * SIZE) / -2);

        height = Math.floor(windowHeight / SIZE);
        width = Math.floor(windowWidth / SIZE);
    }

    function setup() {
        running = false;        // if a game has been started
        set = false;            // if a game is ready
        turned = false;         // to keep from turning more than once per update

        history = new FixedQueue(7);

        score = 0;
        score_enemy = 0;

        width = 0;              // number of tiles across
        height = 0;             // number of tiles top to bottom

        positions = null;       // 2D array to keep track of positions

        loopPlayer = null;            // interval loop object
        loopEnemy = null;            // interval loop object
        doubleSpeed = null;

        current_speed = SPEED;

        // clear the old blocks
        //$(".block").remove(":not(#food)");
        $(".block").remove();
        $("#message").empty();
        $("#message").hide();

        $("#speed").empty();
        $("#speed").hide();

        foods = [];

        // resize window
        resizeWindow();

        // create position array
        positions = new Array(width);
        for (var j = 0; j < width; j++) {
            positions[j] = new Array(height);
            for (var k = 0; k < height; k++) {
                positions[j][k] = 0;
            }
        }

        snakes = new Array();
        var step = Math.floor(height / snakes_count);
        for (var ii = 0; ii < snakes_count; ii++) {
            var snake_ii = {
                direction: {           // direction to update in
                    x: 1,
                    y: 0
                },
                blocks: [],
                turnBackFlag: false,
                tail: null,            // pointer to the tail block
                head: null
            };
            
            // initilize snake
            for (var i = LENGTH - 1; i >= 0; i--) {
                var head = (i == LENGTH - 1) ? 1 : 0;
                if(ii > 0){
                    if(ii % 2 == 0) {
                        createBlock(snake_ii, width-(i+1), height-ii*step, head);
                        snake_ii.direction.x = -1;
                    }
                    else {
                        createBlock(snake_ii, i, height-ii*step, head);
                    }
                }
                else {
                    createBlock(snake_ii, i, 0, head);
                }
            }
            snake_ii.head = snake_ii.blocks[0];

            snakes.push(snake_ii);
        }


        for (var f = 0; f < MAX_FOOD_COUNT; f++) {
            createFood();
        }

        set = true;
    }

    $(document).ready(function() {
        setup();

        // initiate keyboard listener
        $(document).keydown(function(e) {keyHandler(e);});

        // initiate touchscreen listener
        $(document).click(function(e) {tapHandler(e);});

        // sideloader exit listener
        $("#exit").click(function() {
            enableSideloader();
        });

        // initiate resize listener
        $(window).resize(function(e) {
            stopGame();
            setup();
        });

        // bind fastclick
        $(function() {
            FastClick.attach(document.body);
        });
    });

    // public API definition
    var Snake = {}

    // return height of board in blocks
    Snake.getHeight = function() {
        return height;
    }

    // return width of board in blocks
    Snake.getWidth = function() {
        return width;
    }

    // return 2D array of positions
    Snake.getPositions = function() {
        return positions.clone();
    }

    // check position returns 0 if empty, 1 if full, 2 if food
    Snake.checkPosition = function(x, y) {
        return checkPosition(x, y);
    }

    // return head position
    Snake.getPosition = function(num) {
        if(!num) num = 0;
        return {x: snakes[num].head.x, y: snakes[num].head.y};
    }

    // return tail position
    Snake.getTailPosition = function(num) {
        if(!num) num = 0;
        return {x: snakes[num].tail.x, y: snakes[num].tail.y};
    }

    // return main food position
    Snake.getFoodPosition = function() {
        var food = document.getElementById("food");
        return {x: food.x, y: food.y};
    }
    
    // return all foods position
    Snake.getFoodsPosition = function() {
        //var foods = document.getElementsByClassName("food");
        return foods;
    }

    // return length of the snake
    Snake.getLength = function() {
        return score + 5;
    }

    // return direction of the snake
    Snake.getDirection = function(num) {
        if(!num) num = 0;
        return snakes[num].direction;
    }

    Snake.getSnake = function(num) {
        if(!num) num = 0;
        return snakes[num];
    }

    Snake.die = function(num) {
        if(!num) num = 0;
        dieSnake(num);
    }

    return Snake;

})();
