const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
var admin = require("firebase-admin");
// const ObjectId = require('mongodb').ObjectId;
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

//firebase admin initialization

var serviceAccount = require('./simple-firebase-authenti-2116a-firebase-adminsdk-fb1kb-24a130d51f.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});


//middle wear
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.aimii.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function verifyToken(req, res, next) {
    if (req.headers.authorization?.startsWith('Bearer ')) {
        const idToken = req.headers.authorization.split('Bearer ')[1];
        try {
            const decodedUser = await admin.auth().verifyIdToken(idToken);
            req.decodedUserEmail = decodedUser.email;
        }
        catch {
            
        }
    }
    next();
}

async function run() {
    try {
        await client.connect();
        const database = client.db("EmaJohn");
        const productsCollection = database.collection("products");
        const orderCollection = database.collection("orders");

        //get products api
        app.get('/products', async (req, res) => {
            const cursor = productsCollection.find({});
            const page = req.query.page;
            const size = parseInt(req.query.size);
            const count = await cursor.count();
            let products;
            if (page) {
                products = await cursor.skip(page * size).limit(size).toArray();
            } else {
                products = await cursor.toArray();
            }
            res.send({count, products});
        })

        //use post to get data by keys
        app.post('/products/byKeys', async (req, res) => {
            const keys = req.body;
            const query = { key: { $in: keys } }
            const products = await productsCollection.find(query).toArray()
            res.json(products);
        })

        //Add orders api
        app.post('/orders', async (req, res) => {
            const order = req.body;
            order.createdAt = new Date();
            console.log(order);
            const result = await orderCollection.insertOne(order);
            res.json(result)
        })

        //get api to get all orders
        app.get('/orders', verifyToken, async (req, res) => {
            const email = req.query.email;
            if (req.decodedUserEmail === email) {
                let query = {};
                query = { email: email };
                const cursor = orderCollection.find(query);
                const orders = await cursor.toArray();
                res.json(orders);
            }
            else {
                res.status(401).json({message: "User is not authorized"})
            }
        })
    }
    finally {
        // await client.close();
    }
}
run().catch(console.dir);



app.get('/', (req, res) => res.send('Hello world'));
app.listen(port, () => console.log("Running server on port", port))
