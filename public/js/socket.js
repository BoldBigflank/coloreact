/** @jsx React.DOM */
var socket = io.connect();
console.log("socket is defined");
var game = {};
var playerId;
var playerPosition;
var playerScore;
var scoreDiff;
var topScore = 0;
var playerSpread;
var timestamp_diff = null;

var Player = React.createClass({
	render: function(){
		var classes=""
		if(this.props.count == 1) topScore = this.props.player.score;
		if(playerId == this.props.player.id){
			// Update player specific stuff
			playerScore = this.props.player.score;
			$(".playerScore").html(playerScore)
			$(".playerPosition").html(this.props.count)
			$(".playerSpread").html("+" + ( topScore - playerScore ) )
		}
		if(this.props.gameState == "active" && this.props.player.answer != null)
			classes="warning"
		if(this.props.gameState == "ended" && this.props.player.answer )
			if(this.props.player.id == this.props.winner.id)
				classes="success";
			else
				classes="danger";
		return (
			<tr className={classes}>
				<td>{this.props.count}</td>
				<td>{this.props.player.name}</td>
				<td>{this.props.player.score}</td>
			</tr>
		)
	}
})


var GameComponent = React.createClass({
	getInitialState: function(){
		return {
	        title:null
	        , colors:["#FFF"]
	        , round:0
	        , answers:[]
	        , now:0
	        , state:"ended"
	        , players:[]
	        , begin:0
	        , end:1
	        , winner:{}
	        , count:null
	        , alert:null
    	}
	},
	componentDidMount: function(){
		var self = this
		socket.on("game", function(data){
			if(data.now) timestamp_diff = null;
			console.log("game", data);
			self.setState(data);
		})

		socket.on('alert', function (data) {
			console.log("socket alert", data)
			self.state.alert = data
		});
	},
	render: function(){
		var self = this
		var count = 0
		var colorFiles = {
			"#F28019":"orange.png",
			"#32AA3A":"green.png",
			"#299ADA":"blue.png",
			"#B11322":"red.png",
			"#7F0F7D":"purple.png"
		}
		var players = this.state.players.map(function(player) {
			return (<Player 
				player={player} 

				gameState={self.state.state} 
				winner = {self.state.winner}
				count={++count}/>);
		})

		if(this.state.state == 'prep') this.state.alert = null;
		var alert =  (this.state.alert) ? <div class="alert clickInfo"> {this.state.alert}</div> : "";
		var timestamp = new Date().getTime();
		if(timestamp_diff == null) timestamp_diff = timestamp - this.state.now;
		if(timestamp < this.state.end){
			percent = parseInt((this.state.end - timestamp - timestamp_diff) / (this.state.end-this.state.begin) * 100);
			if(percent > 100) percent = 100;
		} else {
			percent = 0;
		}
		
		var currentColorIndex = parseInt((timestamp - this.state.begin) / this.state.timePerColor);
		if(currentColorIndex >= this.state.colors.length) currentColorIndex = this.state.colors.length-1;
		if(currentColorIndex < 0) currentColorIndex = 0;
		var currentColor = this.state.colors[currentColorIndex];
		var correctColor = this.state.colors[this.state.colors.length-1];

		var colorFile = colorFiles[currentColor];

		var info = (this.state.state != 'ended') ? <div class="div-info alert alert-info">Begin: {this.state.begin} End: {this.state.end} Length: {this.state.colors.length} </div> : "";
		
		var diff = timestamp - (this.state.begin + ((this.state.colors.length-1) * this.state.timePerColor )) ;

		return (
			<div class="row">
				<div id="leaderboard_container" class="container col-md-3 hidden-sm hidden-xs">
				  <span><h4>Leaderboard</h4></span>
				  <table class="leaders table table-striped">
				    <thead>
				      <tr>
				        <th>#</th>
				        <th>Name:</th>
				        <th>Score</th>
				      </tr>
				    </thead>
				    <tbody>
				    {players}
				    </tbody>
				  </table>
				</div>
				<div class="col-md-9">
					<div class="">
						<h1>
							Round {this.state.round}
						</h1>
						
						<div class="colorHolder">
							<div class="correctColorDiv" style={{background: correctColor}}>
								<div class="colorButton">
								<img src={colorFile}></img>
								</div>
								{alert}
							</div>
						</div>
					</div>
					
					<input id="answer-time" type="hidden" value={diff}></input>
				</div>
			</div>
        );
	}
});

// var Answer = React.createClass({
// 	render: function(){
// 		return <a class="btn btn-block btn-large btn-primary answer">{this.props.answer}</a>
// 	}
// });


// The clock
setInterval(function() {
    React.renderComponent(
      GameComponent({timestamp: new Date().getTime()}),
      document.getElementById('question-panel')
    );
  }, 50);

function click_sound(){
    var audio = document.createElement("audio");
    audio.src = "explode.wav";
    audio.addEventListener("ended", function () {
        document.removeChild(this);
    }, false);
    audio.play();   
}



(function($, undefined){
  $(document).ready(function(){
  	React.renderComponent(<GameComponent />, $("#question-panel")[0]);
  	console.log("preparing for sockets");
    
    socket.emit('join', function(playerObj){
    	console.log("emitted join", playerObj)
    	$(".username").text(playerObj.name)
    	playerId = playerObj.id;
    });
    
    $('.colorButton').mousedown(function(){ // Buzz in
		var val = $('#answer-time').val();
    	console.log("answering", val)
    	click_sound();
		if(val !== ''){
			// console.log('test');
			socket.emit('answer', val);
		}
    });

    //Username update
    $('.update-name').click(function(){
    	// var val = $('#username-input').val();
    	var val = prompt("What is your name?")
		if(!val) return;
    	$('.username').text(val)
    	if(val !== ''){
        	socket.emit('name', val, function(err, res){
        	});
      	}
    });

    $(".titleButton").click(function(){ // Start new round
    	console.log("click")
    	socket.emit("state", "prep", function(err, res){

    	})
    	return false;
    });

  });

})(jQuery);