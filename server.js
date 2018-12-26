const express=require('express');
const bodyParser=require('body-parser');
const cors=require('cors');
const knex = require('knex');
const bcrypt = require('bcrypt');

const db = knex({
  client: 'pg',
  connection: {
    host : '127.0.0.1',
    user : 'postgres',
    password : '150815',
    database : 'smartbrain'
  }
});


const app=express();
app.use(bodyParser.json());
app.use(cors());


app.get('/',(req,res)=>{
	res.send('Working');
})

app.post('/signin', (req,res)=>{	
	const{email, password}=req.body;
	if(!email||!password){
		return res.status(400).json('incorrect form submission');
	}
	db.select('email','hash').from('login')
		.where('email','=',email)
		.then(data=>{
			const isValid=bcrypt.compareSync(password, data[0].hash);
			if(isValid){
				return db.select('*').from('users')
					.where('email','=',email)
					.then(user=>{
						res.json(user[0])
					})
					.catch(err=>res.status(400).json('unable to get user'))
			}else{
				res.status(400).json('wrong credentials')
			}
			
		})
		.catch(err=>res.status(400).json('wrong credential'))
})

app.post('/register', (req,res)=>{	
	const{email, name, password}=req.body;
	if(!email||!name||!password){
		return res.status(400).json('incorrect form submission');
	}
	const saltRounds = 10;
	const salt = bcrypt.genSaltSync(saltRounds);
	const hash=bcrypt.hashSync(password,salt);
		db.transaction(trx=>{
			trx.insert({
				hash:hash,
				email:email
			})
			.into('login')
			.returning('email')
			.then(loginEmail=>{
				return trx('users')
					.returning('*')
					.insert({
						email:loginEmail[0],
						name:name,
						joined:new Date()
					})
					.then(user=>{
						res.json(user[0]);
					})
			})
			.then(trx.commit)
			.catch(trx.rollback)
		})
		.catch(err=>res.status(400).json('unable to register'))
})

app.get('/profile/:id',(req,res)=>{
	const{id}=req.params;
	let found=false;
	db.select('*').from('users').where({id})
		.then(user=>{
			if(user.length){
				res.json(user[0])
			}else{
				res.status(400).json('not found')
			}
		})
		.catch(err=>res.status(400).json('error getting user'))
})

app.put('/image',(req,res)=>{
	const {id}=req.body;
	db('users').where('id', '=', id)
	.increment('entries',1)
	.returning('entries')
	.then(entries=>{
		res.json(entries[0]);
	})
	.catch(err=>res.status(400).json('unable to get entries'))
})




app.listen(process.env.PORT || 3000,()=>{
	console.log('Running on port ${process.env.PORT}');
})