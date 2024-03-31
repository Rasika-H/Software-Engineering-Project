const express = require("express");
const path = require('path');
const app = express();
const https = require('https');
const fs = require('fs');
let mysql = require('mysql2');

let PORT = 5001

app.use(express.json());
app.use('/static',  express.static(__dirname + '/static'));


app.get("/", (req, res) => {
    console.log("HI");
    res.sendFile(path.join(__dirname+'/views/index.html'));
});

app.get("/restaurants", (req, res) => {
    console.log("HI");
    res.sendFile(path.join(__dirname+'/views/restaurant.html'));
});

app.get("/login/", (req, res) => {
    console.log("HI");
    res.sendFile(path.join(__dirname+'/views/loginMain.html'));
});





app.get("/orders/details/:orderId", (req, res) => {
    orderID = req.params.orderId;

    console.log("GETTING DETAILS");


    let con = mysql.createConnection({
        host: "localhost",
        user: "maptestuser",
        password: "password",
        database: 'MAPTESTDB'
    });


    let query = "select o.orderid, r.restuarant_name, MI.item_name, items.quantity, MI.item_price, items.quantity * MI.item_price as total from ORDERS o\n" +
        "inner join ORDER_ITEM items on o.orderid=items.order_id\n" +
        "inner join Restaurant r on r.restaurant_id=o.restuarant_id\n" +
        "inner join menu m on m.restaurant_id=r.restaurant_id\n" +
        "inner join Menu_Item MI on m.menu_id = MI.menu_id and MI.item_id=items.item_id\n" +
        "where o.orderid=" + orderID + ";"

    let resultArray = [];

    con.query(query, (err, result) => {
        if(err) throw err;

        console.log(result);

        for(let i = 0 ; i < result.length ; ++i) {
            resultArray.push({

                itemName : result[i].item_name,
                quantity : result[i].quantity,
                item_price : result[i].item_price,
                total : result[i].total
            });
        }

        console.log("CHECK");
        console.log(resultArray);


        res.send({"restaurantName": result[0].restuarant_name, 'items': resultArray, "orderNumber": result[0].orderid});
    });
});

app.get("/orders/", (req, res) => {
    // res.sendFile(path.join(__dirname+'/views/orderDetails.html'));
    res.sendFile(path.join(__dirname+'/views/orderDetailsMain.html'));
});

// app.get("/agent/orders/:orderId", (req, res) => {
//     orderID = req.params.orderId;
//     res.sendFile(path.join(__dirname+'/views/orderDetailsAgent.html'));
// });



app.get("/agent/orders/", (req, res) => {
    // res.sendFile(path.join(__dirname+'/views/orderDetails.html'));
    res.sendFile(path.join(__dirname+'/views/orderDetailsAgent.html'));
});

// app.get("/agent/orders/", (req, res) => {
//     // orderID = req.params.orderId;
//     res.sendFile(path.join(__dirname+'/views/orderDetailsAgent.html'));
//     console.log("AGENTANGETNAScblnv;q")
//     console.log("AGENTANGETNAScblnv;q")
//     // res.sendFile(path.join(__dirname+'/views/orderDetailsMain.html'));
// });

app.get("/agent/orders/latest/:facebookId", (req, res) => {
    let facebookId = req.params.facebookId;

    let con = mysql.createConnection({
        host: "localhost",
        user: "maptestuser",
        password: "password",
        database: 'MAPTESTDB'
    });

    con.connect(function(err) {
        if (err) throw err;
        console.log("Connected!");


        con.query("SELECT userid from user where facebookid="+ facebookId + ";", (err, result) => {
            if(err) throw err;

            let userid = result[0].userid;
            
            console.log("CHECK AGENT ID");
            console.log(userid)

            con.query("SELECT orderid FROM ORDERS WHERE agent_id=" + userid + " AND order_status != 'COMPLETED' ORDER BY orderid DESC LIMIT 1;", function (err, result) {
                if(err) throw err;

                let orderId = result[0].orderid;

                console.log(orderId);

                res.send({"orderid": orderId});
            });
        });
    });
});

app.get("/help/", (req, res) => {
    res.sendFile(path.join(__dirname+'/views/help.html'));
});

app.get("/orders/track/:orderId", (req, res) => {
    let orderID = req.params.orderId;
    let con = mysql.createConnection({
        host: "localhost",
        user: "maptestuser",
        password: "password",
        database: 'MAPTESTDB'
    });

    orderData = {};

    console.log("SELECT * FROM ORDERS WHERE ORDERID=" + orderID + ";");

    con.query("SELECT * FROM ORDERS WHERE ORDERID=" + orderID + ";", (err, result) => {
        if(err) {
            console.error(err);
            throw err;
        }

        console.log("CHECK");
        console.log(result);

        orderData['latitude'] = result[0].order_latitude;
        orderData['longitude'] = result[0].order_longitude;


        console.log(orderData);

        res.send(orderData);
    });
});

app.post("/orders/track/:orderId", (req, res) => {
    console.log("Updating location");
    let orderID = req.params.orderId;
    let latitude = req.body['latitude'];
    let longitude = req.body['longitude'];

    let con = mysql.createConnection({
        host: "localhost",
        user: "maptestuser",
        password: "password",
        database: 'MAPTESTDB'
    });

    const query = "update ORDERS set order_latitude=" + latitude + ", order_longitude=" + longitude + " where orderid=" + orderID + ";"

    console.log(query);

    con.query(query, (err, result) => {
        if(err) {
            console.error(err);
            throw err;
        }

        res.send({"status" : "done"});
    });
});


app.post("/api/user", (req, res) => {
    // res.json({requestBody: req.body})
    console.log(req.body);

    let facebookId = req.body['facebookId'];


    let con = mysql.createConnection({
        host: "localhost",
        user: "maptestuser",
        password: "password",
        database: 'MAPTESTDB'
    });

    con.connect(function(err) {
        if (err) throw err;
        console.log("Connected!");

        con.query("SELECT * FROM USER WHERE TYPE='user' AND FACEBOOKID=" + facebookId + ";", function (err, result) {
            if (err) throw err;

            console.log(result.length);

            if(result.length === 0) {
                con.query("INSERT INTO USER(FACEBOOKID, TYPE) VALUES(" + facebookId + "," + "'user');", function (err, result) {
                    if(err) throw err;

                    console.log(result);
                    con.query("SELECT * FROM USER WHERE TYPE='user' AND FACEBOOKID=" + facebookId + ";", (result, err) => {
                        if(err) throw err;

                        // if()

                        console.log(result);

                        res.send({userId: result[0].USERID, facebookId: result[0].FACEBOOKID});
                    });
                });
            }
            else {
                res.send({userId: result[0].USERID, facebookId: result[0].FACEBOOKID});
            }
        });
    });
});


app.get("/orders/latest/:facebookId", (req, res) =>{
    console.log("LATEST");
    let facebookId = req.params.facebookId;

    let con = mysql.createConnection({
        host: "localhost",
        user: "maptestuser",
        password: "password",
        database: 'MAPTESTDB'
    });

    con.connect(function(err) {
        if (err) throw err;
        console.log("Connected!");


        con.query("SELECT userid from user where facebookid="+ facebookId + ";", (err, result) => {
            if(err) throw err;

            let userid = result[0].userid;

            con.query("SELECT orderid FROM ORDERS WHERE user_id=" + userid + " AND order_status != 'COMPLETED' ORDER BY orderid DESC LIMIT 1;", function (err, result) {
                if(err) throw err;

                let orderId = result[0].orderid;

                console.log(orderId);

                res.send({"orderid": orderId});
            });
        });
    });
});

// httpsServer = https.createServer({}, app);

// app.listen(5001);


const options = {
    key: fs.readFileSync('/Users/sumedh/Projects/ECE567/logintest/logintest/localhost-key.pem'),
    cert: fs.readFileSync('/Users/sumedh/Projects/ECE567/logintest/logintest/localhost.pem'),
};
https
    .createServer(options, app)
    .listen(PORT);