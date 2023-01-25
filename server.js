const express = require('express')
const app = express()
const bodyParser = require('body-parser')
app.use(bodyParser.urlencoded({ extended: true }))
app.set('view engine', 'ejs')
app.use('/public', express.static('public'))
const methodOverride = require('method-override')
app.use(methodOverride('_method'))

require('dotenv').config()

const MongoClient = require('mongodb').MongoClient
var db
MongoClient.connect(
  process.env.DB_URL,
  { useUnifiedTopology: true },
  (err, client) => {
    if (err) return console.log(err)
    db = client.db('board')

    app.listen(process.env.PORT, (req, res) => {
      console.log('listening on 8080')
    })
  },
)

app.get('/', (req, res) => {
  console.log(__dirname)
  //res.sendFile(__dirname + '/views/index.ejs')
  res.render('index')
})

app.get('/write', (req, res) => {
  //res.sendFile(__dirname + '/views/write.ejs')
  res.render('write')
})

app.get('/list', (req, res) => {
  //post의 모든 데이터를 가져옴.
  db.collection('post')
    .find()
    .toArray((err, result) => {
      // console.log(result)
      res.render('list.ejs', { posts: result })
    })
})


app.get('/detail/:id', (req, res) => {
  db.collection('post').findOne(
    { _id: parseInt(req.params.id) },
    (err, result) => {
      console.log(result)
      res.render('detail.ejs', { data: result })
    },
  )
})

app.get('/edit/:id', (req, res) => {
  db.collection('post').findOne(
    { _id: parseInt(req.params.id) },
    (err, result) => {
      console.log(result)

      res.render('edit.ejs', { data: result })
    },
  )
})

app.put('/edit', (req, res) => {
  db.collection('post').updateOne(
    { _id: parseInt(req.body.id) },
    { $set: { title: req.body.title, date: req.body.date } },
    (err, result) => {
      console.log('수정완료')
      res.redirect('/list')
    },
  )
})

const passport = require('passport')
const LocalStrategy = require('passport-local').Strategy
const session = require('express-session')

app.use(session({ secret: 'test1234', resave: true, saveUninitialized: false }))
app.use(passport.initialize())
app.use(passport.session())

app.get('/login', (req, res) => {
  res.render('login.ejs')
})

app.post(
  '/login',
  passport.authenticate('local', {
    failureRedirect: '/fail', //로그인 실패시 /fail 경로로 이동시켜주는 역할
  }),
  (req, res) => {
    res.redirect('/')
  },
)

app.get('/mypage', loginSucess, (req, res) => {
  console.log(req.user)
  res.render('mypage.ejs', { user: req.user })
})

function loginSucess(req, res, next) {
  //로그인 후 세션이 잇으면 요청, req.user 항상 있음. 로그인했니
  if (req.user) {
    next()
  } else {
    res.send('로그인이 안됬음')
  }
}

//authenticate 이걸로 로그인시만사용을 함.
passport.use(
  new LocalStrategy(
    {
      usernameField: 'id',
      passwordField: 'pw',
      session: true,
      passReqToCallback: false,
    },
    (입력한아이디, 입력한비번, done) => {
      //console.log(입력한아이디, 입력한비번);
      db.collection('login').findOne({ id: 입력한아이디 }, (err, result) => {
        if (err) return done(err)

        if (!result)
          return done(null, false, { message: '존재하지않는 아이디요' })
        if (입력한비번 == result.pw) {
          return done(null, result)
        } else {
          return done(null, false, { message: '비번틀렸어요' })
        }
      })
    },
  ),
)

//id를 이용해서 세션을 저장시키는코드(로그인 성공시 발동)
passport.serializeUser((user, done) => {
  done(null, user.id)
})
//이 세션 데이터를 가진 사람을 DB에서 찾아주는 역할(마이페이지 접속시 발동)
passport.deserializeUser((아이디, done) => {
  //DB에서 user.id로 유저를 찾은 뒤에 유저정보를
  db.collection('login').findOne({ id: 아이디 }, (err, result) => {
    done(null, result)
  })
})

app.get('/search', (req, res) => {
  // console.log(req.query.value);
  //정확히 일치하는것만 찾아줌
  //db.collection('post').find({title :req.query.value }).toArray((err,result)=>{
  var searchValue = [
    {
      $search: {
        index: 'titleSearch',
        text: {
          query: req.query.value,
          path: 'title', // 제목날짜 둘다 찾고 싶으면 ['제목', '날짜']
        },
      },
    },
    { $sort: { _id: 1 } }, //1오름차순 -1 내림차순
  ]
  db.collection('post')
    .aggregate(searchValue)
    .toArray((err, result) => {
      console.log(result)
      res.render('listSearch.ejs', { posts: result })
    })
})

app.post('/register', (req, res) => {
  db.collection('login').insertOne(
    { id: req.body.id, pw: req.body.pw },
    (err, result) => {
      res.redirect('/')
    },
  )
})

app.post('/add', (req, res) => {
  //npm install body-parser 설치해서 req파라미터를 사용해야함.
  //res.send('전송완료');
  //console.log(req.body);
  //console.log(req.body.title);

  db.collection('post_counter').findOne({ name: '게시물수' }, (err, result) => {
    console.log('totalcount=' + result.totalcount)
    var totalcountId = result.totalcount

    var saveCotents = {
      _id: totalcountId + 1,
      title: req.body.title,
      date: req.body.date,
      regiid: req.user._id,
    }
    db.collection('post').insertOne(saveCotents, (err, client) => {
      console.log('저장완료')
      //set연산차는 값을 바꿔달라는 의미 업데이트시 사용  inc를 쓰면 증가의미
      db.collection('post_counter').updateOne(
        { name: '게시물수' },
        { $inc: { totalcount: 1 } },
        (err, result) => {
          if (err) return console.log(err)
        },
      )
    })
  })
})

app.delete('/delete', (req, res) => {
  console.log(req.body)
  req.body._id = parseInt(req.body._id)
  
  var deleteContents = {_id: req.body._id, regiid: req.user._id} ;

  db.collection('post').deleteOne(deleteContents, (err, result) => {
    if(result){
      console.log('실패했습니다.');
    }
    res.status(200).send({ message: '성공했습니다.' })
  })
})

//server api 관리를 위함
//app.use('/shop',require('./routes/shop.js'));

//upload 라이브러리 최초 세팅
let multer = require('multer');
var storage = multer.diskStorage({
  destination : (req, file, cb)=>{
   cb(null,'./public/image')
  },
  filename : (req, file, cb)=>{
    cb(null, file.originalname)
  }
});

var upload = multer({storage: storage});

app.get('/upload',(req,res)=>{
res.render('upload.ejs');
})

//하나씩 업로드
app.post('/upload',upload.single('upload1'), (req, res)=>{
  //array로 변경 및 최대 10개
  //app.post('/upload',upload.array('upload1',10), (req, res)=>{
  res.send('완료');

})
