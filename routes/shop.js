var router = require('express').Router();

router.get('/shirts',(req,res)=>{
    res.send('셔츠 파는 페이지 입니다.');
})

router.get('/pants',(req,res)=>{
    res.send('바지 파는 페이지 입니다.');
})

module.exports = router;