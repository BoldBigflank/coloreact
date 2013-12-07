var _ = require('underscore')
  , fs = require('fs')

var EventEmitter = require('events').EventEmitter;

exports.eventEmitter = new EventEmitter();

var prepTime = 2 * 1000;
var roundTime;
var timePerColor = 80;
var minColors = 40;
var maxColors = 200;
var endTimeBuffer = 3000;

var game = {
    title:null
    , round:0
    , state:"prep"
    , players:[]
    , begin:null
    , end:null
    , now:null
    , colors:["#FFF"]
    , winner:{}
    , count:null
} // prep, active, ended

var names
var colorsArray = ["#00F", "#0F0", "#0FF", "#F00", "#F0F", "#FF0", "#FF0"];

var init = function(cb){
    game = {
        title:null
        , round:0
        , colors:["#FFF"]
        , state:"ended"
        , players:[]
        , begin:null
        , end:null
        , timePerColor:timePerColor
        , winner:{}
        , count:null
    }
    
    fs.readFile('names.txt', function(err, data) {
        if(err) throw err;
        names = _.shuffle(data.toString().split("\n"));
    });

    fs.readFile('questions.txt', function(err, data) {
        if(err) throw err;
        questions = _.shuffle(data.toString().split("\n"));
    });

}

newRound = function(cb){
    // Find the round's winner
    // if(game.players.length > 0){
    //     var winningPlayer = _.max(game.players, function(player){
    //         return player.score
    //     })
    //     if(winningPlayer){
    //         var winner = {
    //             name: winningPlayer.name
    //             , title: game.title
    //             , score: winningPlayer.score
    //             , id: winningPlayer.id
    //         }
    //         game.winner = winner
    //     }
    // }
    // Remove the current answer times from the players
    for(var index in game.players){
        var player = game.players[index]
        player.answer = null;
        game.players[index] = player
    }

    // Refresh when out of questions
    // if(questions.length<1){
    //     fs.readFile('questions.txt', function(err, data) {
    //         if(err) throw err;
    //         questions = _.shuffle(data.toString().split("\n"));
    //     });
    // }
    
    // var questionArray = questions.shift().split("|");
    // game.title = questionArray.shift();
    game.round++ ;
    game.winner = {};
    
    game.colors = []
    game.colors.push ( colorsArray[_.random(0, colorsArray.length-1)] );

    var remainingColors = _.without(colorsArray, game.colors[0]);

    var stack  = _.random(minColors,maxColors);
    for(var i=0; i< stack; i++){
        game.colors.unshift( remainingColors[_.random(0, remainingColors.length-1)] )
    }



    // game.correctAnswer = questionArray[0];
    // game.answers = _.shuffle(questionArray);

    // Pick the beginning time
    var now = new Date().getTime(); // Milliseconds
    var begin = now + prepTime;
    game.begin = begin;

    var end = begin + game.colors.length * timePerColor + endTimeBuffer;
    game.end = end;

    roundTime = timePerColor * stack + endTimeBuffer;
    // game.title = ""

    game.state = "prep"; // DEBUG: Make prep first in prod
    setTimeout(function(){
        console.log("timer 1 ended")
        exports.setState('active', function(err, res){
            if(!err)
                exports.eventEmitter.emit('state', res)
        })
    }, prepTime);
    setTimeout(function(){
        console.log("timer 2 ended")
        exports.setState('ended', function(err, res){
            if(!err)
                exports.eventEmitter.emit('state', res)
        })
    }, prepTime + roundTime);
    cb()
}

exports.join = function(uuid, cb){
    if(uuid === undefined) {
        cb("UUID not found")
        return
    }
    game.now = new Date().getTime()
    var player = _.find(game.players, function(player){ return player.id == uuid })
    if( typeof player === 'undefined'){
        var player = {
            id: uuid
            , name: names.shift() || uuid
            , answer: null
            , score: 0
            , status: 'active'
        }
        game.players.push(player)
    }
    cb(null, {players: game.players})
}

exports.leave = function(id){
    // Remove their player
    var player = _.find(game.players, function(player){ return player.id == id })
    game.players = _.without(game.players, player)

}

// exports.getAnswers = function(){ return answers }

exports.getGame = function(){ return game }

exports.getScores = function(){
    return _.map(game.players, function(val, key){ return { id:val.id, name:val.name, score:val.score }; })
}

exports.getPlayers = function(){ return game.players }

exports.getPlayer = function(uuid){ return _.find(game.players, function(player){ return player.id == uuid })}

exports.getState = function(){ return game.state }

exports.getTitle = function(){ return game.title }

exports.getRound = function(){ return game.round }


exports.getWinner = function(){ return game.winner }

exports.getScoreboard = function(){
    return {
        title: game.title
        , scores: _.map(game.players, function(val, key){ return { id:val.id, name:val.name, score:val.score }; })
        , players: game.players.length
    }

}

exports.setName = function(id, name, cb){
    var p = _.find(game.players, function(player){ return player.id == id })
    if(p) p.name = name
    cb(null, { players: game.players })
}

exports.setState = function(state, cb){
    if(state==game.state) return cb("Already on this state")
    // Only start new rounds when the last is done
    if(game.state != "ended" && state == "prep") return cb("Only start new rounds when the last is done")

    // entry, vote, result
    game.state = state
    game.now = new Date().getTime()
    if(state=="prep"){ // New round
        // game.help = "Be prepared to list answers that fit the following category."
        newRound(function(){
            cb(null, game)
        });
    }
    else if (state == "active"){
        // game.help = "List items that fit the category."
        cb(null, game)
    }
    else if (state == "ended"){
        // Give the winner a point
        _.each(game.players, function(player){
            if(player.id == game.winner.id) player.score ++;
        })

        game.players = _.sortBy(game.players, function(player){return -1 *  player.score;});
        // game.help = "The round has ended.  Click 'New Round' to begin."
        cb(null, game)
    }
    else{
        // game.help = "";
        cb(null, game)
    }
}

exports.addAnswer = function(uuid, time, cb){
    if(game.state != "active") return cb("Not accepting answers");

    var player = _.find(game.players, function(player){ return player.id == uuid })
    console.log("Player answer", time, player.answer)
    if(player.answer != null) return cb("You have already answered.")
    player.answer = time;

    if(time < 0) return cb("You answered too early!", {players: game.players});

    if (typeof game.winner.id == "undefined" || parseInt(time) < game.winner.time) {
        // We have a new winner
        game.winner = {
            id: uuid,
            time: parseInt(time)
        }
        return cb("You answered in " + time + "ms.  You are currently winning!", {players: game.players});
    } else {
        return cb("You answered in " + time + "ms.  You are too slow!");
    }
}

exports.reset = function(cb){
    init()
    cb(null, game)
}

init()