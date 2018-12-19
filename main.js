
const util = require("util")
const fs = require("fs")

const express = require("express")
const bodyParser = require("body-parser")
const cookieSession = require("cookie-session")
const formidable = require("formidable")
const flash = require("connect-flash")

const MongoClient = require("mongodb").MongoClient
const assert = require("assert")
const ObjectID = require("mongodb").ObjectID

const PORT = process.env.PORT || 3000
const SECRET_KEY = process.env.SECRET_KEY || "session"
const MONGODB_URL = process.env.MONGODB_URL || "127.0.0.1:27017"


const config = {
    port: PORT,
    secretKey: SECRET_KEY,
    mongodbURL: MONGODB_URL
}

/*
function getConfigVar(name) {
    if (!process.env[name]) {
        // eslint-disable-next-line no-console 
        console.error(`Environment variable ${name} not set`)
        process.exit(-1)
    }
    return process.env[name]
}
*/

function guestRequired(req, res, next) {
    if (req.session.username) {
        req.flash("info", "You have logged in.")
        res.redirect("/")
    } else {
        next()
    }
}

function loginRequired(req, res, next) {
    if (req.session.username) {
        next()
    } else {
        req.flash("info", "Please login.")
        res.redirect("/login")
    }
}

function parsePhotoDocument(body, doc = {}) {
    function assign(dest, src, keys) {
        for (const k of keys) {
            if (src[k]) dest[k] = src[k]
        }
    }

    const address = {}

    assign(doc, body, ["name", "borough", "cuisine"])
    assign(address, body, ["street", "building", "zipcode"])

    if (body.photo && /image/.test(body.photo.type)) {
        doc.photo = body.photo.data.toString("base64")
        doc.photoMimetype = body.photo.type
    }

    if (body.lat && body.lng) {
        address.coord = [+body.lat, +body.lng]
    }

    if (Object.keys(address).length > 0) {
        doc.address = address
    }

    return doc
}

MongoClient.connect(config.mongodbURL, function (err, db) {

    function ownerRequired(req, res, next) {
        const id = req.query.id || req.body.id

        if (id) {
            db.collection("restaurants")
                .findOne({ _id: ObjectID(id) }, { owner: 1 }, function (err, result) {
                    assert.equal(err, null)

                    if (!result) {
                        next()
                    } else if (result.owner === req.session.username) {
                        next()
                    } else {
                        req.flash("info", "Only the owner can perform this operation")
                        res.redirect(req.headers.referer)
                    }
                })
        } else {
            next()
        }
    }

    const app = express()

    app.listen(config.port, function () {
        /* eslint-disable-next-line no-console */
        console.log("Running on port " + config.port)
    })

    app.use(function (req, res, next) {
        /* eslint-disable-next-line no-console */
        console.log(new Date().toLocaleTimeString(), req.method, req.url)
        next()
    })

    app.use(cookieSession({
        name: "session",
        keys: [config.secretKey]
    }))

    app.use(bodyParser.json())

    app.use(bodyParser.urlencoded({ extended: false }))

    app.use(function (req, res, next) {
        const readFile = util.promisify(fs.readFile)

        if (req.is("multipart/form-data")) {
            const form = new formidable.IncomingForm()

            form.parse(req, function (err, fields, files) {
                assert.equal(err)

                    ; (async function () {
                        const body = {}

                        for (const [key, value] of Object.entries(fields)) {
                            if (value === "") continue
                            body[key] = value
                        }

                        for (const [key, file] of Object.entries(files)) {
                            if (file.size === 0) continue
                            body[key] = {
                                data: await readFile(file.path),
                                type: file.type,
                                path: file.path,
                                size: file.size,
                                name: file.name
                            }
                        }

                        req.body = body

                        next()
                    })()
            })
        } else {
            next()
        }
    })

    app.use(flash())

    app.use(function (req, res, next) {
        res.locals.username = req.session.username
        res.locals.messages = req.flash("info")
        next()
    })

<<<<<<< HEAD
    app.use("/css", express.static('./view/css'));

    app.use("/kendo-ui", express.static('./view/kendo-ui'));

    app.use("/js", express.static('./view/js'));

    app.use("/img", express.static('./view/img'));

    app.use("/fonts", express.static('./view/fonts'));

    // app.use('/ext_script', express.static(path.join(__dirname, 'node_modules')));

    app.set('views', './view');
=======
    app.set('views', './view')
>>>>>>> 2b7416575a9597d521e30ada1e188354db543c1e
    app.set("view engine", "ejs")

    app.get("/", loginRequired, function (req, res) {
        res.render("index.ejs")
    })

    app.get("/image", function (req, res) {
        const projection = { photo: 1, photoMimetype: 1 }
        db.collection("restaurants")
            .findOne({ _id: ObjectID(req.query.id) }, projection, function (err, result) {
                assert.equal(err, null)

                res.type(result.photoMimetype)
                res.send(Buffer.from(result.photo, "base64"))
            })
    })

    app.get("/login", guestRequired, function (req, res) {
        res.render("login.ejs")
    })

    app.get("/register", guestRequired, function (req, res) {
        res.render("register.ejs")
    })

    app.get("/ohMyKing/new", loginRequired, function (req, res) {
        res.render("ohMyKing/new.ejs")
    })

    app.get("/ohMyKing/list", loginRequired, function (req, res) {
        db.collection("restaurants")
            .find({}, { name: 1 })
            .toArray(function (err, restaurants) {
                assert.equal(err, null)

                res.render("ohMyKing/list.ejs", { restaurants })
            })
    })

    app.get("/ohMyKing/show", loginRequired, function (req, res) {
        db.collection("restaurants")
            .findOne({ "_id": ObjectID(req.query.id) }, { photo: 0 }, function (err, restaurant) {
                assert.equal(err, null)

                res.render("ohMyKing/show.ejs", { restaurant })
            })
    })

    app.get("/OhMyKing/search", loginRequired, function (req, res) {
        if (Object.keys(req.query).length > 0) {
            const criteria = {}
            for (const [k, v] of Object.entries(req.query)) {
                if (v) criteria[k] = v
            }

            db.collection("restaurants")
                .find(criteria, { photo: 0 })
                .toArray(function (err, restaurants) {
                    assert.equal(err, null)

                    res.render("ohMyKing/list.ejs", { restaurants })
                })
        } else {
            res.render("ohMyKing/search.ejs")
        }
    })

    app.get("/OhMyKing/rate", loginRequired, function (req, res) {
        const id = req.query.id
        const username = req.session.username

        db.collection("restaurants")
            .find({ _id: ObjectID(id), "grades.user": username }).count(function (err, count) {
                assert.equal(err, null)

                if (count === 0) {
                    res.render("ohMyKing/rate.ejs", { id: id })
                } else {
                    req.flash("info", "You have already rated this restaurant before.")
                    res.redirect(`/ohMyKing/show?id=${id}`)
                }
            })
    })

    app.get("/ohMyKing/delete", loginRequired, ownerRequired, function (req, res) {
        res.render("ohMyKing/delete.ejs", { id: req.query.id })
    })

    app.get("/ohMyKing/update", loginRequired, ownerRequired, function (req, res) {
        const restaurant_id = req.query.id

        db.collection("restaurants")
            .findOne({ _id: ObjectID(restaurant_id) }, { photo: 0 }, function (err, result) {
                assert.equal(err, null)

                res.render("ohMyKing/update.ejs", { result: result })
            })
    })

    app.get("/api/ohMyKing/:type/:value", function (req, res) {
        const { type, value } = req.params

        db.collection("restaurants")
            .find({ [type]: value }).toArray(function (err, result) {
                assert.equal(err, null)

                res.json(result)
            })
    })


    app.post("/register", function (req, res) {
        const username = req.body.username
        const password = req.body.password
        const cpassword = req.body.cpassword

        if (password !== cpassword) {
            req.flash("info", "Your password does not match.")
            res.redirect("/register")
        } else {
            db.collection("users").find({ username: username }).toArray(function (err, result) {
                assert.equal(err, null)

                if (result.length > 0) {
                    req.flash("info", "This username is already existed.")
                    res.redirect("/register")
                } else {
                    const doc = { "username": username, "password": password }
                    db.collection("users").insertOne(doc, function (err) {
                        assert.equal(err, null)

                        req.flash("info", "Register successfully, please login.")
                        res.redirect("/login")
                    })
                }
            })
        }
    })

    app.post("/login", function (req, res) {
        const { username, password } = req.body

        db.collection("users").find({ username, password }).count(function (err, count) {
            assert.equal(err, null)

            if (count === 1) {
                req.session.username = username
                res.redirect("/")
            } else {
                req.flash("info", "Your username or password is wrong.")
                res.redirect("/login")
            }
        })
    })

    app.post("/logout", function (req, res) {
        req.session.username = null
        res.redirect("/login")
    })

    app.post("/ohMyKing/new", loginRequired, function (req, res) {
        const doc = parsePhotoDocument(req.body)
        doc.owner = req.session.username
        doc.grades = []

        db.collection("restaurants").insertOne(doc, function (err) {
            assert.equal(err, null)

            req.flash("info", "Inserted 1 restaurant")
            res.redirect("/")
        })
    })

    app.post("/ohMyKing/update", loginRequired, function (req, res) {
        const criteria = { _id: ObjectID(req.body.id) }
        const doc = parsePhotoDocument(req.body)

        const updater = {
            $set: {},
            $unset: { borough: true, cuisine: true, address: true }
        }

        for (const [k, v] of Object.entries(doc)) {
            updater.$set[k] = v
            delete updater.$unset[k]
        }

        if (req.body.deletePhoto === "on") {
            updater.$unset.photo = true
            updater.$unset.photoMimetype = true
            delete updater.$set.photo
            delete updater.$set.photoMimetype
        }

        if (Object.keys(updater.$unset).length === 0) {
            delete updater.$unset
        }

        db.collection("restaurants").updateOne(criteria, updater, function (err) {
            assert.equal(err, null)

            res.redirect("/ohMyKing/update?id=" + req.body.id)
        })
    })

    app.post("/ohMyKing/delete", loginRequired, function (req, res) {
        const doc = { "_id": ObjectID(req.body.id) }

        db.collection("restaurants").deleteOne(doc, function (err) {
            if (err) throw err
            res.redirect("/")
        })
    })

    app.post("/ohMyKing/rate", loginRequired, function (req, res) {
        const { id, score } = req.body
        const username = req.session.username

        const criteria = { _id: ObjectID(id) }
        const updater = { $push: { grades: { user: username, score: +score } } }
        db.collection("restaurants")
            .updateOne(criteria, updater, function (err) {
                assert.equal(err, null)

                res.redirect("/")
            })
    })

    app.post("/api/onMyKing", function (req, res) {
        if (req.body.name && req.body.owner) {
            const id = new ObjectID()
            const doc = Object.assign({ _id: id, grades: [] }, req.body)

            db.collection("restaurants").insertOne(doc, function (err) {
                assert.equal(err, null)

                res.json({ status: "ok", _id: id })
            })
        } else {
            res.json({ status: "failed" })
        }
    })
})
