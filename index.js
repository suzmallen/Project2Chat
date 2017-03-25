var express = require('express');
var session = require('client-sessions');
var bodyParser = require('body-parser');
var multer = require('multer'); // v1.0.5
var upload = multer(); // for parsing multipart/form-data
var app = express();
var bcrypt = require('bcrypt');
const saltRounds = 10;


app.use(session({
  cookieName: 'session',
  secret: '2394jn5ltksf=0348*!@lkfjii',
  duration: 30 * 60 * 1000,
  activeDuration: 5 * 60 * 1000,
}));




var pg = require("pg"); // This is the postgres database connection module.
const connectionString = (process.env.DATABASE_URL||"postgres://Admin:pa55word@localhost:5432/chatroom");

app.set('port', (process.env.PORT || 5035));

app.use(express.static(__dirname + '/public'));
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded



// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

var checkLogin = function (req, res, next) {
    
  console.log('checking login info:' + req.url);
  if (req.url=='/login'||req.url=='/signin'||req.url=='/signup'||req.url=='/addaccount'){
      next();
  } else{       
  if (req.session && req.session.user) {
    
        //req.session.user = user;  //refresh the session value
        req.session.loggedIn = true;
      console.log("the person is logged in");
       next();
      }else{
          var params = {"message":""};
          res.render('pages/login',params);
      }
      // finishing processing the middleware and run the route
  }
    
   
}

app.use(checkLogin);



app.get('/', function(request, response) {
    if(request.session && request.session.sessionid){
         var params = {"sessionid":request.session.sessionid, "sessionuserid": sess.sessionuserid};
        response.render('index.html');
    }else{//redirect user to get a sessionid and sessionuserid
        response.render('pages/newchat');
    }
        
});

app.get('/logout',function(request,response){
        request.session.reset();
    var params = {"message":""}
    response.render('pages/login',params);
        
        });

app.get('/getmessages', function(request, response) {
	getMessagesFromDb(request.query.id, function(error, result){
        response.status(200).json(result);
    });
    
});

app.get('/getchats', function(request, response) {
	getChatsFromDb(request.session.userid, function(error, result){
        response.status(200).json(result);
    });
    
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


app.get('/getsessionfriends', function(request,response){
   getSessionfriendsfromDB(request.query.sessionid, function(error,result){
        if (error || result==null || result.length==0){
            response.status(500).JSON({success:false,data:error});
        }else{
            var friends = result;
            response.status(200).json(result);
        }
        
    });
});

app.post('/login', function(request,response){
    console.log(request.body.username);
    console.log(request.body.password);
    var username = request.body.username;
    var password = request.body.password;
    
//In this we are assigning email to sess.email variable.
//email comes from HTML page.
  validatePassword(username,password, function(error, validated, user){
      
      
      
      if(validated){
          console.log("Login success:" + validated);
          request.session.user = user.name;
          request.session.loggedIn = true;
          request.session.userid = user.userid;
          response.render("pages/newchat");
      }else{
          params = {"message":"Username or Password invalid"};
          response.render('pages/login',params);
      }
  });
  
  
});

app.get('/signin',function(request,response){
    var params = {"message":""};
     response.render('pages/login',params); 
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
        bcrypt.hash(password, saltRounds, function(error, hash) {
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
                params = {"message":""};
                response.render('pages/login',params);
                console.log("redirect to login page");
            } else {
                response.render('pages/signup');        
        
		      }
            });
   
	       });
       
    }
    
});

app.get('/chatsetup',function(request, response){
    response.render('pages/chatsetup');
    
});

app.get('/joinchat',function(request, response){
    response.render('pages/newchat');
    
});

app.get('/chat',function(request, response){
    var params = {sessionuserid:request.query.id, sessionid:request.query.sessionid};
    response.render('pages/index',params);
    
});


app.post('/addnewchat',function(request, response){
   console.log(request); 
    var sessionname = request.body.sessionname;
    var invitation = request.body.invitation;
    var participants = request.body.participants;
    
    createChatInDb(sessionname, invitation, function(error, result) {
            // This is the callback function that will be called when the DB is done.
            request.session.sessionid = result;
            // Make sure we don't have errors, and then pull new messages from database
            if (error || result == "error" ) {
                //redirect to login page
                response.render('pages/error');
                console.log("redirect to error page");
            } else {
                for(i=0;i<participants.length;i++){
                    addChatParticipant(result, participants[i]);  
                    }
                response.status(200).json({success:true, data:"success"});
               
            }
     });
});
         
app.post('/addsessionfriend',function(request,response){
    console.log("adding friend function called");
    var userid = request.body.userid;
    var sessionid = request.body.sessionid;
    console.log("adding friend:" + userid.toString() + " and sessionid:" + sessionid.toString() );
    addFriendtoSession(sessionid, userid, function(error,result){
        // Make sure we don't have errors, and then pull new messages from database
            if (error ) {
                
                response.render('pages/error');
                console.log("redirect to error page");
            } else {
               
                  response.status(200).json({success:true, data:"success"});
                
		         
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
                getMessagesFromDb(sessionid, function(error,result2){
                    response.status(200).json(result2);
                
		          });
            }
        });
});



app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});


function  validatePassword(username,password, callback){
    console.log("validating user's password: " + username);

	var client = new pg.Client(connectionString);

	client.connect(function(err) {
		if (err) {
			console.log("Error connecting to DB: ")
			console.log(err);
			callback(err, null);
		}

		var sql = "SELECT * FROM ChatUser where username = $1";
        var params = [username];

		var query = client.query(sql, params, function(err, result) {
			// we are now done getting the data from the DB, disconnect the client
			client.end(function(err) {
				if (err) throw err;
                
			});

			if (err) {
				console.log("Error in query: ")
				console.log(err);
				callback(err, null);
			} else{
                if (result)
{                console.log("Found result: " + JSON.stringify(result.rows));
                //verify the hashed password
                bcrypt.compare(password, result.rows[0].password, function(error, verified) {
                    console.log("error:" + error);
                    console.log("verified:" + verified);
                    if(error){
                        throw new Error('Something went wrong!');
                        callback(error,false);}
                    if(!verified) {
                            console.log("Don't try! We got you!");
                                callback(null,false);
                        } else {
                              var user={name:result.rows[0].fname + ' ' + result.rows[0].lname, userid:result.rows[0].userid}
                              callback(null,true,user);}
                       
                    });
                              
              }  else{
                  callback("User Does not Exist",false);
              }
            }

			//
		});
	});

   
}


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
                              
function addFriendtoSession(sessionid, userid, callback){
    var client = new pg.Client(connectionString);

	client.connect(function(err) {
		if (err) {
			console.log("Error connecting to DB: ")
			console.log(err);
			callback(err, null);
		}

		var sql = "INSERT INTO SessionUser(sessionid, userid, active) VALUES ($1,$2,true)";
		var params = [sessionid, userid];

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


function getChatsFromDb(id, callback){
   console.log("Getting messages from db with sessionid: " + id);

	var client = new pg.Client(connectionString);

	client.connect(function(err) {
		if (err) {
			console.log("Error connecting to DB: ")
			console.log(err);
			callback(err, null);
		}

		var sql = "select * from chatsession cs inner join Sessionuser us on cs.sessionid = us.sessionid " + 
                  "where us.userid =  $1::int " ;
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
 
}

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
                  "INNER JOIN ChatUser u on u.userid = su.userid WHERE s.sessionid = $1::int ORDER BY m.messagedatetime ";
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

function getSessionfriendsfromDB(sessionid,callback){
    console.log("Getting friends from database");

	var client = new pg.Client(connectionString);

	client.connect(function(err) {
		if (err) {
			console.log("Error connecting to DB: ")
			console.log(err);
			callback(err, null);
		}

		var sql = "SELECT u.fname, u.lname, u.userid, CASE WHEN su.sessionid is null THEN '0' ELSE '1' END AS insession FROM ChatUser u LEFT OUTER JOIN (SELECT * FROM SessionUser where sessionid= $1::int) su on u.userid = su.userid order by lname, fname;";
        var params = [sessionid];
		
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