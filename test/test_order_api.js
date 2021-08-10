import supertest from 'supertest';
import {
  expect
} from 'chai';
//import randomLocation from 'random-location'
import assertArrays from 'chai-arrays'

const request = supertest("http://localhost:51544")

//considering the start point as one of the stops in the given payload
const startPoint = {
  latitude: 22.344674,
  longitude: 114.124651
}

//considering the radius as 5000 meters here
const radius = 5000;

//function to check if fare amount is correct
function isFareAmountCorrect(actualFareAmount, totalDistance, isOddHours) {
  var tolerance = 0.01;
  // 20$ for first 2000 meters and 5$ for every 200 meters if order placed between 5am - 9pm
  var calculatedNormalFareAmount = (totalDistance - 2000) / 200 * 5 + 20;
  // 30$ for first 2000 meters and 8$ for every 200 meters if order placed between 9pm - 5am
  var calculatedOddHoursFareAmount = (totalDistance - 2000) / 200 * 8 + 30;

  console.log(totalDistance + "----totalDistance-----");
  console.log(actualFareAmount + "----actualFareAmount-----");
  console.log(calculatedNormalFareAmount + "----calculatedNormalFareAmount-----");
  console.log(calculatedOddHoursFareAmount + "----calculatedOddHoursFareAmount-----");
  if (!isOddHours) {
    return (actualFareAmount - calculatedNormalFareAmount) < tolerance;
  } else {
    return (actualFareAmount - calculatedOddHoursFareAmount) < tolerance;
  }
};

//function to verify create order api response (for post api)
function verifyCreateOrderResponse(response, isOddHours) {
  var totalDistance = 0;
  expect(response.body).to.have.keys(['id', 'drivingDistancesInMeters', 'fare']);
  expect(response.statusCode).to.equal(201);
  expect(response.body.id).to.be.a('number');
  expect(response.body.drivingDistancesInMeters).to.be.an('array');
  for (var i in response.body.drivingDistancesInMeters) {
    expect(response.body.drivingDistancesInMeters[i]).to.be.a('number');
    totalDistance = totalDistance + response.body.drivingDistancesInMeters[i]
  }
  expect(response.body.fare).to.have.property("amount");
  expect(parseFloat(response.body.fare.amount)).to.be.a('number');
  expect(isFareAmountCorrect(parseFloat(response.body.fare.amount), totalDistance, isOddHours)).to.be.true;
  expect(response.body.fare).to.have.property("currency").and.to.be.a('string').and.to.equal('HKD');

};

//function for converting latitude & longitude generated from random location to lat & lng required in payload
function getLatitudeLongitudeAsPerPayload(location) {
  var latitudeLongitude = Object.assign({}, location);
  latitudeLongitude.lat = latitudeLongitude.latitude;
  latitudeLongitude.lng = latitudeLongitude.longitude;
  return latitudeLongitude;
};

//function to create order payload
function orderCreatePayload() {

  var createOrderPayload = {};
  createOrderPayload.stops = [];

  var randomLocation = require('random-location');

  //adding the startin point in stops
  createOrderPayload.stops.push(getLatitudeLongitudeAsPerPayload(startPoint));

  //considering 2 random stops here. this can be optimized further by using for loop for generating multiple stops
  var randomStop1 = randomLocation.randomCirclePoint(startPoint, radius);
  var randomStop2 = randomLocation.randomCirclePoint(startPoint, radius);
  createOrderPayload.stops.push(getLatitudeLongitudeAsPerPayload(randomStop1));
  createOrderPayload.stops.push(getLatitudeLongitudeAsPerPayload(randomStop2));

  return createOrderPayload;

};

//function to verify the error response for the api's
function verifyErrorResponse(response, code, errorMessage) {
  expect(response.statusCode).to.equal(code);
  expect(response.body.message).to.be.a('string').and.to.equal(errorMessage);

};

//test post api for creating the order
describe('post order api', function() {
  it('create order without order at', function(done) {

    request.post('/v1/orders')
      .set('Content-Type', 'application/json')
      .send(orderCreatePayload())
      .then(response => {
        console.log("response for create order without order at --- ");
        console.log(response.body);
        verifyCreateOrderResponse(response, true);
        done();
      })
      .catch(error => {
        console.log('error: ' + error.message);
        throw (error);
      });
  });

  it('create order with order at odd hours', function(done) {
    var createOrderPayload = orderCreatePayload();
    const moment = require('moment-timezone');

    var orderAt = moment().tz('Asia/Hong_Kong').add(1, 'days').set({
      hours: 23
    }).format();
    console.log("-----orderAt : " + orderAt);

    createOrderPayload.orderAt = orderAt;

    request.post('/v1/orders')
      .set('Content-Type', 'application/json')
      .send(createOrderPayload)
      .then(response => {
        console.log("response for create order with order at odd hours ---- ");
        console.log(response.body);
        verifyCreateOrderResponse(response, true, done);
        done();
      })
      .catch(error => {
        console.log('Error - ' + error.message);
        throw (error);
      });
  });

  it('fail to create order with only one stop', function(done) {
    var randomLocation = require('random-location');
    var createOrderPayload = {};
    createOrderPayload.stops = [];
    var randomStop1 = randomLocation.randomCirclePoint(startPoint, radius);

    createOrderPayload.stops.push(getLatitudeLongitudeAsPerPayload(randomStop1));

    request.post('/v1/orders')
      .set('Content-Type', 'application/json')
      .send(createOrderPayload)
      .then(response => {
        console.log("response for one stop in payload---- ");
        console.log(response.body);
        verifyErrorResponse(response, 400, 'error in field(s): stops');
        done();
      })
      .catch(error => {
        console.log('Error - ' + error.message);
        throw (error);
      });
  });

  it('fail to create order with incorrect co-ordinates', function(done) {

    var createOrderPayload = {};
    createOrderPayload.stops = [];
    var incorrectCoOrdinates = {
      latitude: 0.344674,
      longitude: 114.124651
    };

    //adding the startin point in stops
    createOrderPayload.stops.push(getLatitudeLongitudeAsPerPayload(startPoint));
    //adding invalid co-ordinates
    createOrderPayload.stops.push(getLatitudeLongitudeAsPerPayload(incorrectCoOrdinates));

    request.post('/v1/orders')
      .set('Content-Type', 'application/json')
      .send(createOrderPayload)
      .then(response => {
        console.log("response for incorrect location ---- ");
        console.log(response.body);
        verifyErrorResponse(response, 503, 'Service Unavailable');
        done();
      })
      .catch(error => {
        console.log('Error - ' + error.message);
        throw (error);
      });
  });

  it('fail to create order with missing payload', function(done) {
    request.post('/v1/orders')
      .set('Content-Type', 'application/json')
      .send('')
      .then(response => {
        console.log("response for missing payload --- ");
        console.log(response.body);
        verifyErrorResponse(response, 400, '');
        done();
      })
      .catch(error => {
        console.log('Error - ' + error.message);
        throw (error);
      });
  });
});

//function to verify the fetch order api response (for get api)
function verifyFetchOrderResponse(response, orderStatus) {
  expect(response.body).to.have.keys(['id', 'stops', 'drivingDistancesInMeters', 'fare', 'status', 'orderDateTime', 'createdTime']);
  expect(response.statusCode).to.equal(200);
  expect(response.body.id).to.be.a('number');
  expect(response.body.stops).to.be.an('array');
  for (var i in response.body.stops) {
    expect(response.body.stops[i]).to.have.keys(['lat', 'lng']);
    expect(response.body.stops[i].lat).to.be.a('number');
    expect(response.body.stops[i].lng).to.be.a('number');
  }
  expect(response.body.drivingDistancesInMeters).to.be.an('array');
  for (var i in response.body.drivingDistancesInMeters) {
    expect(response.body.drivingDistancesInMeters[i]).to.be.a('number');
  }
  expect(response.body.fare).to.have.property("amount");
  expect(response.body.fare).to.have.property("currency").and.to.be.a('string').and.to.equal('HKD');
  expect(response.body.status).to.be.a('string').and.to.equal(orderStatus);
  var orderDateTime = new Date(response.body.orderDateTime);
  var createdTime = new Date(response.body.createdTime);
  expect(orderDateTime >= createdTime).to.be.true;
};

//fetch order api testing. Here we are checking only assigning and incorrect id response. Rest order status are verified in put api
describe('get order api', function() {

  it('fetch assigning status order by order id', async () => {

    var orderId;
    const response = await request
      .post('/v1/orders')
      .set('Content-Type', 'application/json')
      .send(orderCreatePayload());

    orderId = response.body.id;

    console.log("order ID ---- " + orderId);

    request.get('/v1/orders/' + orderId)
      .then(response => {
        console.log("fetch order response for orderid ----" + orderId);
        console.log(response.body);
        verifyFetchOrderResponse(response, "ASSIGNING");

      })
      .catch(err => {
        console.log('error: ' + err.message);
        throw (error);
      });
  });

  it('fetch order for incorrect order id', function(done) {

    var orderId = 12345;

    request.get('/v1/orders/' + orderId)
      .then(response => {
        console.log("fetch order response for incorrect ID ---- ");
        console.log(response.body);
        verifyErrorResponse(response, 404, "ORDER_NOT_FOUND");
        done();
      })
      .catch(err => {
        console.log('error: ' + err.message);
        throw (error);
      });
  });
});

//function to check the put api response
function verifyUpdateOrderResponse(response, orderStatus, statusCode, orderId) {
  expect(response.statusCode).to.equal(statusCode);
  expect(response.body.id).to.be.a('number').and.to.equal(orderId);
  expect(response.body.status).to.be.a('string').and.to.equal(orderStatus);

};

//put api testing for taking the order (assigning -> ongoing)
describe('put api for take order', function() {

  it('take order successfully for assigning order by order id', async () => {
    //here we are creating order first
    var orderId;
    const response = await request
      .post('/v1/orders')
      .set('Content-Type', 'application/json')
      .send(orderCreatePayload());

    orderId = response.body.id;

    console.log("order ID ---- " + orderId);
    //passing the above order id to take put api
    request.put('/v1/orders/' + orderId + '/take')
      .then(response => {
        console.log("take order response for order id ---- " + orderId);
        console.log(response.body);
        verifyUpdateOrderResponse(response, "ONGOING", 200, orderId, 'ongoingTime');

        //here we are verifying the fetch ongoing order get api
        request.get('/v1/orders/' + orderId)
          .then(getResponse => {
            console.log("fetch ongoing order response for orderid ---- " + orderId);
            console.log(getResponse.body);
            verifyFetchOrderResponse(getResponse, "ONGOING");

            // here we are verifying fail error to take order that is in ongoing status
            request.put('/v1/orders/' + orderId + '/take')
              .then(takeResponse => {
                console.log("take order error response for ongoing order---- " + orderId);
                console.log(takeResponse.body);
                verifyErrorResponse(takeResponse, 422, "Order status is not ASSIGNING");
              })
              .catch(err => {
                console.log('error: ' + err.message);
                throw (error);
              })
          })
          .catch(err => {
            console.log('error: ' + err.message);
            throw (error);
          })
          .catch(err => {
            console.log('error: ' + err.message);
            throw (error);
          });
      });
  });

  it('fail to take order for incorrect order id', function(done) {

    var orderId = 12345;

    request.put('/v1/orders/' + orderId + '/take')
      .then(response => {
        console.log("take order error response for incorrect order id---- " + orderId);
        console.log(response.body);
        verifyErrorResponse(response, 404, "ORDER_NOT_FOUND");
        done();
      })
      .catch(err => {
        console.log('error: ' + err.message);
        throw (error);
      });
  });
});

//put api testing for completing the order (assigning -> ongoing -> complete)
describe('put api for complete order', function() {

  it('complete order successfully by order id', async () => {
    //here we are creating order first
    var orderId;
    const response = await request
      .post('/v1/orders')
      .set('Content-Type', 'application/json')
      .send(orderCreatePayload());

    orderId = response.body.id;
    console.log("order ID to complete the order---- " + orderId);
    //passing the above order id to take put api (assigning -> ongoing)
    request.put('/v1/orders/' + orderId + '/take')
      .then(response => {
        console.log("take order response for completing the order id---- " + orderId);
        console.log(response.body);
        //here we are updating status from ongoing -> complete
        request.put('/v1/orders/' + orderId + '/complete')
          .then(putResponse => {
            console.log("complete order response for order id---- " + orderId);
            console.log(putResponse.body);
            verifyUpdateOrderResponse(putResponse, "COMPLETED", 200, orderId, 'completedAt');

            //here we are verifying fetch order for completed status (get api)
            request.get('/v1/orders/' + orderId)
              .then(getResponse => {
                console.log("fetch completed order response for id---- " + orderId);
                console.log(getResponse.body);
                verifyFetchOrderResponse(getResponse, "COMPLETED");

                // here we are verifying fail error to take order that is in completed status
                request.put('/v1/orders/' + orderId + '/take')
                  .then(takeResponse => {
                    console.log("take order error response for completed order---- " + orderId);
                    console.log(takeResponse.body);
                    verifyErrorResponse(takeResponse, 422, "Order status is not ASSIGNING");
                  })
                  .catch(err => {
                    console.log('error: ' + err.message);
                    throw (error);
                  })
              })
              .catch(err => {
                console.log('error: ' + err.message);
                throw (error);
              })
          })
          .catch(err => {
            console.log('error: ' + err.message);
            throw (error);
          });
      })
      .catch(err => {
        console.log('error: ' + err.message);
        throw (error);
      });
  });

  it('fail to complete order for incorrect order id', function(done) {

    var orderId = 12345;

    request.put('/v1/orders/' + orderId + '/complete')
      .then(response => {
        console.log("complete order error response for incorrect order id---- " + orderId);
        console.log(response.body);
        verifyErrorResponse(response, 404, "ORDER_NOT_FOUND");
        done();
      })
      .catch(err => {
        console.log('error: ' + err.message);
        throw (error);
      });
  });

  it('fail to complete order for invaild status order', async () => {
    //here we are creating order
    var orderId;
    const response = await request
      .post('/v1/orders')
      .set('Content-Type', 'application/json')
      .send(orderCreatePayload());

    orderId = response.body.id;
    console.log("order ID to complete the order---- " + orderId);

    // here we are verifying the fail to complete order error that is in assigning status
    request.put('/v1/orders/' + orderId + '/complete')
      .then(takeResponse => {
        console.log("complete order error response for completed order---- " + orderId);
        console.log(takeResponse.body);
        verifyErrorResponse(takeResponse, 422, "Order status is not ONGOING");
      })
      .catch(err => {
        console.log('error: ' + err.message);
        throw (error);
      })
  });
});

//put api testing for cancelling the order (assigning -> cancelled or assigning -> ongoing -> cancelled)
describe('put api for cancel order', function() {

  it('cancel order successfully for assigned status order id', async () => {
    //here we are creating the order
    var orderId;
    const response = await request
      .post('/v1/orders')
      .set('Content-Type', 'application/json')
      .send(orderCreatePayload());

    orderId = response.body.id;
    console.log("order ID to cancel the order---- " + orderId);
    //here we are passing the above order Id to cancel api to test assigning -> cancelled
    request.put('/v1/orders/' + orderId + '/cancel')
      .then(cancelResponse => {
        console.log("cancel order response for order id---- " + orderId);
        console.log(cancelResponse.body);
        verifyUpdateOrderResponse(cancelResponse, "CANCELLED", 200, orderId, 'cancelledAt');

        //here we are verifying fetch cancelled order api response
        request.get('/v1/orders/' + orderId)
          .then(getResponse => {
            console.log("fetch cancelled order response for id---- " + orderId);
            console.log(getResponse.body);
            verifyFetchOrderResponse(getResponse, "CANCELLED");

            // here we are verifying the fail to take order response that is in cancelled status
            request.put('/v1/orders/' + orderId + '/take')
              .then(takeResponse => {
                console.log("take order error response for cancelled order---- " + orderId);
                console.log(takeResponse.body);
                verifyErrorResponse(takeResponse, 422, "Order status is not ASSIGNING");
              })
              .catch(err => {
                console.log('error: ' + err.message);
                throw (error);
              })
          })
          .catch(err => {
            console.log('error: ' + err.message);
            throw (error);
          })
      })
      .catch(err => {
        console.log('error: ' + err.message);
        throw (error);
      });
  });

  it('cancel order successfully for ongoing status order id', async () => {
    //here we are creating the order
    var orderId;
    const response = await request
      .post('/v1/orders')
      .set('Content-Type', 'application/json')
      .send(orderCreatePayload());

    orderId = response.body.id;
    console.log("order ID to cancel the order---- " + orderId);
    //here we are passing the above order Id to put api for updating status from assigning -> ongoing
    request.put('/v1/orders/' + orderId + '/take')
      .then(response => {
        console.log("take order response for cancelling the order id---- " + orderId);
        console.log(response.body);
        //here we are verifying the put api for cancelling the ongoing order (ongoing -> cancelled)
        request.put('/v1/orders/' + orderId + '/cancel')
          .then(cancelResponse => {
            console.log("cancel order response for order id---- " + orderId);
            console.log(cancelResponse.body);
            verifyUpdateOrderResponse(cancelResponse, "CANCELLED", 200, orderId, 'cancelledAt');

          })
          .catch(err => {
            console.log('error: ' + err.message);
            throw (error);
          });

      })
      .catch(err => {
        console.log('error: ' + err.message);
        throw (error);
      });

  });

  it('fail to cancel order for completed status order id', async () => {
    //here we are creating the order
    var orderId;
    const response = await request
      .post('/v1/orders')
      .set('Content-Type', 'application/json')
      .send(orderCreatePayload());

    orderId = response.body.id;
    console.log("order ID to cancel the order---- " + orderId);
    //here we are passing the above order Id to put api for updating status from assigning -> ongoing
    request.put('/v1/orders/' + orderId + '/take')
      .then(response => {
        console.log("take order response for cancelling the order id---- " + orderId);
        console.log(response.body);
        //here we are updating status from ongoing -> completed
        request.put('/v1/orders/' + orderId + '/complete')
          .then(putResponse => {
            console.log("complete order response for order id---- " + orderId);
            console.log(putResponse.body);
            //here we are verifying the fail error response to cancel the completed order
            request.put('/v1/orders/' + orderId + '/cancel')
              .then(response => {
                console.log("cancel order error response for completed order id---- " + orderId);
                console.log(response.body);
                verifyErrorResponse(response, 422, "Order status is COMPLETED already");

              })
              .catch(err => {
                console.log('error: ' + err.message);
                throw (error);
              });
          })
          .catch(err => {
            console.log('error: ' + err.message);
            throw (error);
          });
      })
      .catch(err => {
        console.log('error: ' + err.message);
        throw (error);
      });
  });

  it('fail to cancel order for incorrect order id', function(done) {

    var orderId = 12345;
    request.put('/v1/orders/' + orderId + '/cancel')
      .then(response => {
        console.log("cancel order error response for incorrect order id---- " + orderId);
        console.log(response.body);
        verifyErrorResponse(response, 404, "ORDER_NOT_FOUND");
        done();
      })
      .catch(err => {
        console.log('error: ' + err.message);
        throw (error);
      });
  });
});
