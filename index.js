var express = require('express');
var bodyParser = require('body-parser');
var multer = require('multer'); // v1.0.5
var upload = multer(); // for parsing multipart/form-data
var app = express();
var pass = require('password-hash-and-salt');

var pg = require("pg"); // This is the postgres database connection module.
const connectionString = (process.env.DATABASE_URL||"postgres://Admin:pa55word@localhost:5432/chatroom");

app.set('port', (process.env.PORT || 5035));

app.use(express.static(__dirname + '/public'));
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded


// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');


app.get('/', function(request, response) {
	response.render('pages/index');  
});

app.get('/getmessages', function(request, response) {
	getPerson(request, response);
});

app.get('/getpeople', function(request, response) {
    var chatid = request.query.id;
    getPeoplefromDB(id,function(error, result){
        if (error || result==null||result.length !=1){
            response.status(500).json({success:false, data:error});
        }else{
            var people = result;
            response.status(200).json(result);
        }
    });
});

app.get('/getfriends', function(request,response){
   getfriendsfromDB(function(error,result){
        if (error || result==null || result.length==0){
            response.status(500).JSON({success:false,data:error});
        }else{
            var friends = result;
            response.status(200).json(result);
        }
        
    });
});

app.get('/login', function(request,response){
    response.render('pages/login');
});

app.get('/signup', function(request,response){
    response.render('pages/signup');
});

app.post('/addaccount',function(request,response){
    //get all the entered data
    console.log(request.body);
   
    var username = request.body.username;
    var fname = request.body.fname;
    var lname = request.body.lname;
    var password = request.body.password;
    var vpassword = request.body.vpassword;
    var hashedpassword = ""
    console.log(username);
    console.log(password);
    //check password match
    if (vpassword == password){
        //hash password
        
        pass(password).hash(function(error, hash) {
            console.log("hashing password");
        if(error)
            throw new Error('Something went wrong!');
            console.log(error);
        // Store hash (incl. algorithm, iterations, and salt) 
            hashedpassword = hash;
             //save user to database
            console.log("saving user to database");
        	saveUserToDb(fname, lname, username, hashedpassword, function(error, result) {
            // This is the callback function that will be called when the DB is done.
            
            // Make sure we don't have errors, and then redirect to login page
            if (error || result == "saved" ) {
                //redirect to login page
                response.render('pages/login');
                console.log("redirect to login page");
            } else {
                response.render('pages/signup');        
        
		      }
            });
   
	       });
    }
    
})

app.get('/chatsetup',function(request, response){
    response.render('pages/chatsetup');
    
});

app.get('/joinchat',function(request, response){
    response.render('pages/newchat');
    
});


app.post('/addnewchat',function(request, response){
   console.log(request); 
    var sessionname = request.body.sessionname;
    var invitation = request.body.invitation;
    var participants = request.body.participants;
    
    createChatInDb(sessionname, invitation, function(error, result) {
            // This is the callback function that will be called when the DB is done.
            
            // Make sure we don't have errors, and then pull new messages from database
            if (error || result == "error" ) {
                //redirect to login page
                response.render('pages/error');
                console.log("redirect to error page");
            } else {
                for(i=0;i<participants.length;i++){
                    addChatParticipant(result, participants[i]);  
                    }
            }
     });
});
         


app.post('/postmessage',function(request,response){
    //get all the entered data
    console.log(request.body);
   
    var message = request.body.message;
    var sessionuserid = request.body.sessionuserid;
    var sessionid = request.body.sessionid;
    
    console.log(message);
    console.log(sessionuserid);
        saveMessageToDb(sessionuserid, message, function(error, result) {
            // This is the callback function that will be called when the DB is done.
            
            // Make sure we don't have errors, and then pull new messages from database
            if (error || result == "saved" ) {
                //redirect to login page
                response.render('pages/error');
                console.log("redirect to error page");
            } else {
                getMessagesFromDb(sessionid, function(error,result){
                    if (error || result == null || result.length == 0) {
                        response.status(500);
                        response.send(JSON.stringify({success: false, data: error}));
                    } else {
                        response.status(200);
                        response.send(JSON.stringify(result));
                    }
                
		          });
            }
        });
});



app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});




function addChatParticipant(sessionid, participant){
    console.log("sessionid:" + sessionid);
    console.log("participant to add:" + participant);
    
    var client = new pg.Client(connectionString);
    
            
            client.connect(function(err) {
            if (err) {
                console.log("Error connecting to DB: ")
                console.log(err);
                callback(err, null);
            }
            var sql = "INSERT INTO SessionUser(sessionid, userid, active) VALUES ($1::int,$2::int,true);";
            var params = [sessionid, parseInt(participant)];
            console.log(params);
            var query = client.query(sql, params, function(err, result) {
                // we are now done getting the data from the DB, disconnect the client
                client.end(function(err) {
                    if (err) throw err;

                });

                if (err) {
                    console.log("Error in query: ")
                    console.log(err);
                    
                }
            });
            
        });
                         
		
	}
                              
 
function createChatInDb(sessionname, invitation, callback){
    console.log("saving chat to database: " + sessionname);

	var client = new pg.Client(connectionString);

	client.connect(function(err) {
		if (err) {
			console.log("Error connecting to DB: ")
			console.log(err);
			callback(err, null);
		}

		var sql = "INSERT INTO ChatSession(sessionname, invitation_message, active) VALUES ($1,$2, true) RETURNING sessionid";
		var params = [sessionname, invitation];
        console.log(params);
		var query = client.query(sql, params, function(err, result) {
            // we are now done getting the data from the DB, disconnect the client
			client.end(function(err) {
				if (err) throw err;
                
			});

			if (err) {
				console.log("Error in query: ")
				console.log(err);
				callback(err, null);
			}

			//console.log("Found result: " + JSON.stringify(result.rows));

			// call whatever function the person that called us wanted, giving it
			// the results that we have been compiling
            console.log(result.rows[0].sessionid);
			callback(null, result.rows[0].sessionid);
            
		});
	});
    
   
}
                              


function saveUserToDb(fname, lname, username, password, callback) {
	console.log("saving following user to database: " + username);

	var client = new pg.Client(connectionString);

	client.connect(function(err) {
		if (err) {
			console.log("Error connecting to DB: ")
			console.log(err);
			callback(err, null);
		}

		var sql = "INSERT INTO ChatUser(fname, lname, username, password) VALUES ($1,$2,$3,$4)";
		var params = [fname,lname,username,password];

		var query = client.query(sql, params, function(err, result) {
			// we are now done getting the data from the DB, disconnect the client
			client.end(function(err) {
				if (err) throw err;
                
			});

			if (err) {
				console.log("Error in query: ")
				console.log(err);
				callback(err, null);
			}

			//console.log("Found result: " + JSON.stringify(result.rows));

			// call whatever function the person that called us wanted, giving it
			// the results that we have been compiling
			callback(null, "saved");
		});
	});

}

function  saveMessageToDb(sessionuserid, message, callback) {
	console.log("Saving message to database with sessionuserid: " + sessionuserid);

	var client = new pg.Client(connectionString);

	client.connect(function(err) {
		if (err) {
			console.log("Error connecting to DB: ")
			console.log(err);
			callback(err, null);
		}

		var sql = "INSERT INTO Message(sessionuserid, messagetext) VALUES ($1::int,$2);";
		var params = [sessionuserid,message];

		var query = client.query(sql, params, function(err, result) {
			// we are now done getting the data from the DB, disconnect the client
			client.end(function(err) {
				if (err) throw err;
			});

			if (err) {
				console.log("Error in query: ")
				console.log(err);
				callback(err, null);
			}

			// call whatever function the person that called us wanted, giving it
			// the results that we have been compiling
			callback(null, "success");
		});
	});

} // end of saveMessagetoDb


function getMessagesFromDb(id, callback) {
	console.log("Getting messages from db with sessionid: " + id);

	var client = new pg.Client(connectionString);

	client.connect(function(err) {
		if (err) {
			console.log("Error connecting to DB: ")
			console.log(err);
			callback(err, null);
		}

		var sql = "SELECT m.*, u.fname, u.lname FROM Message m INNER JOIN SessionUser su on m.sessionuserid = su.sessionuserid  " + 
                  "INNER JOIN ChatSession s on s.sessionid = su.sessionid " + 
                  "INNER JOIN ChatUser u on u.userid = su.userid WHERE s.sessionid = $1::int";
		var params = [id];

		var query = client.query(sql, params, function(err, result) {
			// we are now done getting the data from the DB, disconnect the client
			client.end(function(err) {
				if (err) throw err;
			});

			if (err) {
				console.log("Error in query: ")
				console.log(err);
				callback(err, null);
			}

			console.log("Found result: " + JSON.stringify(result.rows));

			// call whatever function the person that called us wanted, giving it
			// the results that we have been compiling
			callback(null, result.rows);
		});
	});

} // end of getMessagesFromDb

function getfriendsfromDB(callback){
    console.log("Getting friends from database");

	var client = new pg.Client(connectionString);

	client.connect(function(err) {
		if (err) {
			console.log("Error connecting to DB: ")
			console.log(err);
			callback(err, null);
		}

		var sql = "SELECT u.fname, u.lname, u.userid FROM ChatUser u order by lname, fname";
        var params = [];
		
		var query = client.query(sql, params, function(err, result) {
			// we are now done getting the data from the DB, disconnect the client
			client.end(function(err) {
				if (err) throw err;
			});

			if (err) {
				console.log("Error in query: ")
				console.log(err);
				callback(err, null);
			}

			console.log("Found result: " + JSON.stringify(result.rows));

			// call whatever function the person that called us wanted, giving it
			// the results that we have been compiling
			callback(null, result.rows);
		});
	});
    
}