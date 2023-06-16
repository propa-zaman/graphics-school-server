const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const port = process.env.PORT || 5001;

// Middleware
// app.use(cors());
app.use(cors({
    origin: 'https://graphics-school.web.app'
  }));
  
app.use(express.json());

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ error: true, message: 'unauthorized access' });
  }
  // Bearer token
  const token = authorization.split(' ')[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ error: true, message: 'unauthorized access' });
    }
    req.decoded = decoded;
    next();
  });
};

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.4ffbuav.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const schoolCollection = client.db('graphicsSchool').collection('school');
    const usersCollection = client.db('graphicsSchool').collection('users');
    const enrolledCollection = client.db('graphicsSchool').collection('enrolled');

    app.post('/jwt', (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });

      res.send({ token });
    });

    // Warning: use verifyJWT before using verifyAdmin
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (user?.role !== 'admin') {
        return res.status(403).send({ error: true, message: 'forbidden message' });
      }
      next();
    };

    // school api
    
    // app.get('/school', async (req, res) => {
    //   const result = await schoolCollection.find().toArray();
    //   res.send(result);
    // });

    app.get('/school', async (req, res) => {
        console.log(req.query.email);
        let query = {};
        if (req.query?.email) {
            query = { email: req.query.email }
        }
        const result = await schoolCollection.find(query).toArray();
        res.send(result);
    })

    app.get('/school/:id', async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) }
  
        const result = await schoolCollection.findOne(query);
        res.send(result);
      })
  
      app.post('/school', async (req, res) => {
        const addedToys = req.body;
        console.log(addedToys);
        const result = await schoolCollection.insertOne(addedToys);
        res.send(result);
      });
  
      app.patch('/school/:id', async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updatedAddedToy = req.body;
        console.log(updatedAddedToy);
        const updateDoc = {
            $set: {
                status: updatedAddedToy.status
            },
        };
        const result = await schoolCollection.updateOne(filter, updateDoc);
        res.send(result);
    })
  
    app.delete('/school/:id', async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) }
        const result = await schoolCollection.deleteOne(query);
        res.send(result);
    })

    // security layer: verifyJWT
    // email same
    // check admin
    app.get('/school/approve/:email', async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        res.send({ admin: false });
      }

      const query = { email: email };
      const user = await schoolCollection.findOne(query);
      const result = { admin: user?.status === 'approve' };
      res.send(result);
    });

    app.patch('/school/approve/:id', async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: 'approve',
        },
      };

      const result = await schoolCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.get('/school/deny/:email', async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        res.send({ admin: false });
      }

      const query = { email: email };
      const user = await schoolCollection.findOne(query);
      const result = { admin: user?.status === 'deny' };
      res.send(result);
    });

    app.patch('/school/approve/:id', async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: 'deny',
        },
      };

      const result = await schoolCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // users api
    app.get('/users', verifyJWT, verifyAdmin, async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    app.get('/users/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };

      const result = await usersCollection.findOne(query);
      res.send(result);
    });

    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await usersCollection.findOne(query);

      if (existingUser) {
        return res.send({ message: 'user already exists' });
      }

      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    app.delete('/users/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    });

    // security layer: verifyJWT
    // email same
    // check admin
    app.get('/users/admin/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        res.send({ admin: false });
      }

      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const result = { admin: user?.role === 'admin' };
      res.send(result);
    });

    app.patch('/users/admin/:id', async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: 'admin',
        },
      };

      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.get('/users/instructor/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        res.send({ admin: false });
      }

      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const result = { admin: user?.role === 'instructor' };
      res.send(result);
    });

    app.patch('/users/instructor/:id', async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: 'instructor',
        },
      };

      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // enrolled api
    app.get('/enrolled', verifyJWT, async (req, res) => {
      const email = req.query.email;

      if (!email) {
        res.send([]);
      }

      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res.status(403).send({ error: true, message: 'forbidden access' });
      }

      const query = { email: email };
      const result = await enrolledCollection.find(query).toArray();
      res.send(result);
    });

    app.post('/enrolled', async (req, res) => {
      const item = req.body;
      const result = await enrolledCollection.insertOne(item);
      res.send(result);
    });

    app.delete('/enrolled/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await enrolledCollection.deleteOne(query);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db('admin').command({ ping: 1 });
    console.log('Pinged your deployment. You successfully connected to MongoDB!');
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}

run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('school is running');
});

app.listen(port, () => {
  console.log(`Graphics school on port ${port}`);
});
