import {
  expect
} from 'chai';
import StatusCodes from 'http-status-codes';

const testData = require('./testData');
const testHelpers = require('./testHelpers');

//function to verify create order api response (for post api)
function verifyCreateOrderResponse(response, isOddHours) {
  var totalDistance = 0;
  expect(response.body).to.have.keys(['id', 'drivingDistancesInMeters', 'fare']);
  expect(response.statusCode).to.equal(StatusCodes.CREATED);
  expect(response.body.id).to.be.a('number');
  expect(response.body.drivingDistancesInMeters).to.be.an('array');
  for (var i in response.body.drivingDistancesInMeters) {
    expect(response.body.drivingDistancesInMeters[i]).to.be.a('number');
    totalDistance = totalDistance + response.body.drivingDistancesInMeters[i]
  }
  expect(response.body.fare).to.have.property("amount");
  expect(parseFloat(response.body.fare.amount)).to.be.a('number');
  const isFareAmountCorrect = testHelpers.isFareAmountCorrect(parseFloat(response.body.fare.amount), totalDistance, isOddHours);
  expect(isFareAmountCorrect).to.be.true;
  expect(response.body.fare).to.have.property("currency").and.to.be.a('string').and.to.equal(testData.currency);

};

//function to verify the error response for the api's
function verifyErrorResponse(response, code, errorMessage) {
  expect(response.statusCode).to.equal(code);
  expect(response.body.message).to.be.a('string').and.to.equal(errorMessage);

};

//test post api for creating the order
describe('post order api', function() {

  console.log("create order payload ----- " + testHelpers.orderCreatePayload());
  it('create order without order at', async () => {
    const response = await testData.getRequestURL().post('/v1/orders')
      .set('Content-Type', 'application/json')
      .send(testHelpers.orderCreatePayload());
    console.log("response for create order without order at --- ");
    console.log(response.body);
    verifyCreateOrderResponse(response, false);
  });

  it('create order with order at odd hours', async () => {
    const createOrderPayload = testHelpers.orderCreatePayload();
    const moment = require('moment-timezone');

    const orderAt = moment().tz('Asia/Hong_Kong').add(1, 'days').set({
      hours: 23
    }).format();
    console.log("-----orderAt : " + orderAt);

    createOrderPayload.orderAt = orderAt;

    const response = await testData.getRequestURL().post('/v1/orders')
      .set('Content-Type', 'application/json')
      .send(createOrderPayload);

    console.log("response for create order with order at odd hours ---- ");
    console.log(response.body);
    verifyCreateOrderResponse(response, true);
  });

  it('fail to create order with only one stop', function(done) {
    const randomLocation = require('random-location');
    const createOrderPayload = {};
    createOrderPayload.stops = [];
    const randomStop1 = randomLocation.randomCirclePoint(testData.startPoint, testData.radius);

    createOrderPayload.stops.push(testHelpers.getLatitudeLongitudeAsPerPayload(randomStop1));

    testData.getRequestURL().post('/v1/orders')
      .set('Content-Type', 'application/json')
      .send(createOrderPayload)
      .then(response => {
        console.log("response for one stop in payload---- ");
        console.log(response.body);
        verifyErrorResponse(response, StatusCodes.BAD_REQUEST, 'error in field(s): stops');
        done();
      })
      .catch(error => {
        console.log('Error - ' + error.message);
        throw (error);
      });
  });

  it('fail to create order with incorrect co-ordinates', function(done) {

    const createOrderPayload = {};
    createOrderPayload.stops = [];

    //adding the startin point in stops
    createOrderPayload.stops.push(testHelpers.getLatitudeLongitudeAsPerPayload(testData.startPoint));
    //adding invalid co-ordinates
    createOrderPayload.stops.push(testHelpers.getLatitudeLongitudeAsPerPayload(testData.incorrectCoOrdinates));

    testData.getRequestURL().post('/v1/orders')
      .set('Content-Type', 'application/json')
      .send(createOrderPayload)
      .then(response => {
        console.log("response for incorrect location ---- ");
        console.log(response.body);
        verifyErrorResponse(response, StatusCodes.SERVICE_UNAVAILABLE, 'Service Unavailable');
        done();
      })
      .catch(error => {
        console.log('Error - ' + error.message);
        throw (error);
      });
  });

  it('fail to create order with missing payload', function(done) {
    testData.getRequestURL().post('/v1/orders')
      .set('Content-Type', 'application/json')
      .send('')
      .then(response => {
        console.log("response for missing payload --- ");
        console.log(response.body);
        verifyErrorResponse(response, StatusCodes.BAD_REQUEST, '');
        done();
      })
      .catch(error => {
        console.log('create order post api error - ' + error.message);
        throw (error);
      });
  });
});

//function to verify the fetch order api response (for get api)
function verifyFetchOrderResponse(response, orderStatus, orderId) {
  expect(response.body).to.have.keys(['id', 'stops', 'drivingDistancesInMeters', 'fare', 'status', 'orderDateTime', 'createdTime']);
  expect(response.statusCode).to.equal(StatusCodes.OK);
  expect(response.body.id).to.be.a('number').and.to.equal(orderId);
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
  expect(response.body.fare).to.have.property("currency").and.to.be.a('string').and.to.equal(testData.currency);
  expect(response.body.status).to.be.a('string').and.to.equal(orderStatus);
  const orderDateTime = new Date(response.body.orderDateTime);
  const createdTime = new Date(response.body.createdTime);
  expect(orderDateTime >= createdTime).to.be.true;
};

//fetch order api testing. Here we are checking only assigning and incorrect id response. Rest order status are verified in put api
describe('get order api', function() {

  it('fetch assigning status order by order id', async () => {
    //creating the order first
    const response = await testData.getRequestURL()
      .post('/v1/orders')
      .set('Content-Type', 'application/json')
      .send(testHelpers.orderCreatePayload());

    const orderId = response.body.id;

    console.log("order ID ---- " + orderId);
    //fetching the order with assigning state
    testData.getRequestURL().get('/v1/orders/' + orderId)
      .then(response => {
        console.log("fetch order response for orderid ----" + orderId);
        console.log(response.body);
        verifyFetchOrderResponse(response, "ASSIGNING", orderId);
      })
      .catch(err => {
        console.log('fetch order get api error: ' + err.message);
        throw (error);
      });
  });

  it('fetch order for incorrect order id', function(done) {

    testData.getRequestURL().get('/v1/orders/' + testData.incorrectOrderId)
      .then(response => {
        console.log("fetch order response for incorrect ID ---- ");
        console.log(response.body);
        verifyErrorResponse(response, StatusCodes.NOT_FOUND, "ORDER_NOT_FOUND");
        done();
      })
      .catch(err => {
        console.log('fetch order get api error: ' + err.message);
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
    const response = await testData.getRequestURL()
      .post('/v1/orders')
      .set('Content-Type', 'application/json')
      .send(testHelpers.orderCreatePayload());

    const orderId = response.body.id;

    console.log("order ID ---- " + orderId);
    //passing the above order id to take put api
    testData.getRequestURL().put('/v1/orders/' + orderId + '/take')
      .then(response => {
        console.log("take order response for order id ---- " + orderId);
        console.log(response.body);
        testHelpers.verifyUpdateOrderResponse(response, "ONGOING", StatusCodes.OK, orderId);

        //here we are verifying the fetch ongoing order get api
        testData.getRequestURL().get('/v1/orders/' + orderId)
          .then(getResponse => {
            console.log("fetch ongoing order response for orderid ---- " + orderId);
            console.log(getResponse.body);
            verifyFetchOrderResponse(getResponse, "ONGOING", orderId);

            // here we are verifying fail error to take order that is in ongoing status
            testData.getRequestURL().put('/v1/orders/' + orderId + '/take')
              .then(takeResponse => {
                console.log("take order error response for ongoing order---- " + orderId);
                console.log(takeResponse.body);
                verifyErrorResponse(takeResponse, StatusCodes.UNPROCESSABLE_ENTITY, "Order status is not ASSIGNING");
              })
              .catch(err => {
                console.log('take order error: ' + err.message);
                throw (error);
              })
          })
          .catch(err => {
            console.log('fetch order error: ' + err.message);
            throw (error);
          })
          .catch(err => {
            console.log('take order error: ' + err.message);
            throw (error);
          });
      });
  });

  it('fail to take order for incorrect order id', function(done) {

    testData.getRequestURL().put('/v1/orders/' + testData.incorrectOrderId + '/take')
      .then(response => {
        console.log("take order error response for incorrect order id---- " + testData.incorrectOrderId);
        console.log(response.body);
        verifyErrorResponse(response, StatusCodes.NOT_FOUND, "ORDER_NOT_FOUND");
        done();
      })
      .catch(err => {
        console.log('take order put api error: ' + err.message);
        throw (error);
      });
  });
});

//put api testing for completing the order (assigning -> ongoing -> complete)
describe('put api for complete order', function() {

  it('complete order successfully by order id', async () => {
    //here we are creating order first
    const response = await testData.getRequestURL()
      .post('/v1/orders')
      .set('Content-Type', 'application/json')
      .send(testHelpers.orderCreatePayload());

    const orderId = response.body.id;
    console.log("order ID to complete the order---- " + orderId);
    //passing the above order id to take put api (assigning -> ongoing)
    testData.getRequestURL().put('/v1/orders/' + orderId + '/take')
      .then(response => {
        console.log("take order response for completing the order id---- " + orderId);
        console.log(response.body);
        //here we are updating status from ongoing -> complete
        testData.getRequestURL().put('/v1/orders/' + orderId + '/complete')
          .then(putResponse => {
            console.log("complete order response for order id---- " + orderId);
            console.log(putResponse.body);
            testHelpers.verifyUpdateOrderResponse(putResponse, "COMPLETED", StatusCodes.OK, orderId);

            //here we are verifying fetch order for completed status (get api)
            testData.getRequestURL().get('/v1/orders/' + orderId)
              .then(getResponse => {
                console.log("fetch completed order response for id---- " + orderId);
                console.log(getResponse.body);
                verifyFetchOrderResponse(getResponse, "COMPLETED", orderId);

                // here we are verifying fail error to take order that is in completed status
                testData.getRequestURL().put('/v1/orders/' + orderId + '/take')
                  .then(takeResponse => {
                    console.log("take order error response for completed order---- " + orderId);
                    console.log(takeResponse.body);
                    verifyErrorResponse(takeResponse, StatusCodes.UNPROCESSABLE_ENTITY, "Order status is not ASSIGNING");
                  })
                  .catch(err => {
                    console.log('take order put api error: ' + err.message);
                    throw (error);
                  })
              })
              .catch(err => {
                console.log('fetch order get api error: ' + err.message);
                throw (error);
              })
          })
          .catch(err => {
            console.log('complete order put api error: ' + err.message);
            throw (error);
          });
      })
      .catch(err => {
        console.log('take order get api error: ' + err.message);
        throw (error);
      });
  });

  it('fail to complete order for incorrect order id', function(done) {

    testData.getRequestURL().put('/v1/orders/' + testData.incorrectOrderId + '/complete')
      .then(response => {
        console.log("complete order error response for incorrect order id---- " + testData.incorrectOrderId);
        console.log(response.body);
        verifyErrorResponse(response, StatusCodes.NOT_FOUND, "ORDER_NOT_FOUND");
        done();
      })
      .catch(err => {
        console.log('complete order put api error: ' + err.message);
        throw (error);
      });
  });

  it('fail to complete order for invaild status order', async () => {
    //here we are creating order
    const response = await testData.getRequestURL()
      .post('/v1/orders')
      .set('Content-Type', 'application/json')
      .send(testHelpers.orderCreatePayload());

    const orderId = response.body.id;
    console.log("order ID to complete the order---- " + orderId);

    // here we are verifying the fail to complete order error that is in assigning status
    testData.getRequestURL().put('/v1/orders/' + orderId + '/complete')
      .then(takeResponse => {
        console.log("complete order error response for completed order---- " + orderId);
        console.log(takeResponse.body);
        verifyErrorResponse(takeResponse, StatusCodes.UNPROCESSABLE_ENTITY, "Order status is not ONGOING");
      })
      .catch(err => {
        console.log('complete order put api error: ' + err.message);
        throw (error);
      })
  });
});

//put api testing for cancelling the order (assigning -> cancelled or assigning -> ongoing -> cancelled)
describe('put api for cancel order', function() {
  it('cancel order successfully for assigned status order id', async () => {
    //here we are creating the order
    const response = await testData.getRequestURL()
      .post('/v1/orders')
      .set('Content-Type', 'application/json')
      .send(testHelpers.orderCreatePayload());

    const orderId = response.body.id;
    console.log("order ID to cancel the order---- " + orderId);
    //here we are passing the above order Id to cancel api to test assigning -> cancelled
    testData.getRequestURL().put('/v1/orders/' + orderId + '/cancel')
      .then(cancelResponse => {
        console.log("cancel order response for order id---- " + orderId);
        console.log(cancelResponse.body);
        testHelpers.verifyUpdateOrderResponse(cancelResponse, "CANCELLED", StatusCodes.OK, orderId);

        //here we are verifying fetch cancelled order api response
        testData.getRequestURL().get('/v1/orders/' + orderId)
          .then(getResponse => {
            console.log("fetch cancelled order response for id---- " + orderId);
            console.log(getResponse.body);
            verifyFetchOrderResponse(getResponse, "CANCELLED", orderId);

            // here we are verifying the fail to take order response that is in cancelled status
            testData.getRequestURL().put('/v1/orders/' + orderId + '/take')
              .then(takeResponse => {
                console.log("take order error response for cancelled order---- " + orderId);
                console.log(takeResponse.body);
                verifyErrorResponse(takeResponse, StatusCodes.UNPROCESSABLE_ENTITY, "Order status is not ASSIGNING");
              })
              .catch(err => {
                console.log('take order put api error: ' + err.message);
                throw (error);
              })
          })
          .catch(err => {
            console.log('fetch order get api error: ' + err.message);
            throw (error);
          })
      })
      .catch(err => {
        console.log('cancel order put api error: ' + err.message);
        throw (error);
      });
  });

  it('cancel order successfully for ongoing status order id', async () => {
    //here we are creating the order
    const response = await testData.getRequestURL()
      .post('/v1/orders')
      .set('Content-Type', 'application/json')
      .send(testHelpers.orderCreatePayload());

    const orderId = response.body.id;
    console.log("order ID to cancel the order---- " + orderId);
    //here we are passing the above order Id to put api for updating status from assigning -> ongoing
    testData.getRequestURL().put('/v1/orders/' + orderId + '/take')
      .then(response => {
        console.log("take order response for cancelling the order id---- " + orderId);
        console.log(response.body);
        //here we are verifying the put api for cancelling the ongoing order (ongoing -> cancelled)
        testData.getRequestURL().put('/v1/orders/' + orderId + '/cancel')
          .then(cancelResponse => {
            console.log("cancel order response for order id---- " + orderId);
            console.log(cancelResponse.body);
            testHelpers.verifyUpdateOrderResponse(cancelResponse, "CANCELLED", StatusCodes.OK, orderId);

          })
          .catch(err => {
            console.log('cancel order put api error: ' + err.message);
            throw (error);
          });
      })
      .catch(err => {
        console.log('take order get api error: ' + err.message);
        throw (error);
      });
  });

  it('fail to cancel order for completed status order id', async () => {
    //here we are creating the order
    const response = await testData.getRequestURL()
      .post('/v1/orders')
      .set('Content-Type', 'application/json')
      .send(testHelpers.orderCreatePayload());

    const orderId = response.body.id;
    console.log("order ID to cancel the order---- " + orderId);
    //here we are passing the above order Id to put api for updating status from assigning -> ongoing
    testData.getRequestURL().put('/v1/orders/' + orderId + '/take')
      .then(response => {
        console.log("take order response for cancelling the order id---- " + orderId);
        console.log(response.body);
        //here we are updating status from ongoing -> completed
        testData.getRequestURL().put('/v1/orders/' + orderId + '/complete')
          .then(putResponse => {
            console.log("complete order response for order id---- " + orderId);
            console.log(putResponse.body);
            //here we are verifying the fail error response to cancel the completed order
            testData.getRequestURL().put('/v1/orders/' + orderId + '/cancel')
              .then(response => {
                console.log("cancel order error response for completed order id---- " + orderId);
                console.log(response.body);
                verifyErrorResponse(response, StatusCodes.UNPROCESSABLE_ENTITY, "Order status is COMPLETED already");

              })
              .catch(err => {
                console.log('cancel order put api error: ' + err.message);
                throw (error);
              });
          })
          .catch(err => {
            console.log('complete order put api error: ' + err.message);
            throw (error);
          });
      })
      .catch(err => {
        console.log('fetch order get api error: ' + err.message);
        throw (error);
      });
  });

  it('fail to cancel order for incorrect order id', function(done) {

    testData.getRequestURL().put('/v1/orders/' + testData.incorrectOrderId + '/cancel')
      .then(response => {
        console.log("cancel order error response for incorrect order id---- " + testData.incorrectOrderId);
        console.log(response.body);
        verifyErrorResponse(response, StatusCodes.NOT_FOUND, "ORDER_NOT_FOUND");
        done();
      })
      .catch(err => {
        console.log('cancel order put api error: ' + err.message);
        throw (error);
      });
  });
});
