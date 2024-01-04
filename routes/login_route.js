const express = require('express')
const router = express.Router()
const passport = require('passport')
const bcrypt = require('bcrypt')
const User = require('../models/users')

router.get('/login', checkNotAuthenticated, async (req, res) => {
    res.render('login')
})

router.get('/register', checkNotAuthenticated, async (req, res) => {
    res.render('register', {userExist: false})
})

// post request for loging in
router.post('/login', checkNotAuthenticated, passport.authenticate('local', {
    // successRedirect: '/docs/0/table',
    successRedirect: '/data_lineage/3',
    failureRedirect: '/login',
    failureFlash: true
}))

// post request for registering
router.post('/register', checkNotAuthenticated, async (req, res) => {
    const hashedPassword = await bcrypt.hash(req.body.password, 10)
    // create a new user
    const user = {
        email: req.body.email,
        password: hashedPassword
    }
    // check if the user already exists
    found_users = await User.find({email: req.body.email})
    if (found_users.length == 0) {
        User.insertMany(user)
        res.redirect('/login')
    } else {
        res.render('register', {userExist: true})
    }
})

router.delete('/logout', (req, res) => {
    req.logOut((err) => {
        if (err) console.log(err)
        else res.redirect('/login')
    })
})

function checkNotAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return res.redirect('/docs/0/table')
    }

    next()
}

module.exports = router