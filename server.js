const app = require("express")();
const http = require("http").Server(app);
const io = require("socket.io")(http);

// Auctioneer route for the auctioneer page
app.get("/auctioneer", function (req, res) {
	res.sendFile(__dirname + "/auctioneer.html");
});

// Bidder route for the bidders page
app.get("/bidder", function (req, res) {
	res.sendFile(__dirname + "/bidder.html");
});

// Object that will be sent for updates to the auctioneer page
var auctionUpdate = {
	bidderName: 0,
	highestBid: 0,
	auctionTotalBids: 0,
	numberOfBids: 0,
};
var aucioneerSocketId; // Variable that will store the socket id of the auctioneer
var biddersNumberOfBids = []; // Array that will have objects for the number of bids for each bidder

// listen to websocket connection
io.on("connection", function (socket) {
	// Receive a message from the auctioneer page when auction starts
	socket.on("auctionstart", function (item) {
		aucioneerSocketId = socket.id; // Storing socket id of the auctioneer connection
		auctionUpdate.highestBid = item.price; // Storing the price of the item as the current highest bid when auction starts
		auctionUpdate.bidderName = "Auctioneer"; // Storing Auctioneer as the highest bidder when auction starts
		auctionUpdate.auctionTotalBids = 0; // Storing 0 as total bids when auction starts since it just started
		biddersNumberOfBids.map((bidder) => (bidder.numberOfBids = 0)); // Resetting the number of bids for any existing bidders
		socket.broadcast.to("bidders").emit("startAuction", item); // Sending a message with the item information to the bidders
	});

	// Receive a message from the bidder page when a new bidder signs up their name
	socket.on("newBidder", function (name) {
		socket.join("bidders"); // Join this socket to a room of bidders since they successfully signed up

		// Add this bidder to the array that tracks number of bids for each bidder
		biddersNumberOfBids.push({
			name: name,
			numberOfBids: 0,
		});
	});

	// Receive a message from the bidder page when a bidder submits a new bid
	socket.on("newBid", function (bidInfo) {
		// If the new bid is higher than the current highest bid, we update the data
		if (bidInfo.price > auctionUpdate.highestBid) {
			var bidderIndex = biddersNumberOfBids.findIndex(
				(element) => element.name === bidInfo.name
			); // Get the index of the bidder that just bid
			biddersNumberOfBids[bidderIndex].numberOfBids++; // Increase this bidder's number of bids

			auctionUpdate.highestBid = bidInfo.price; // Update the highest bid
			auctionUpdate.bidderName = bidInfo.name; // Update the highest bidder name
			auctionUpdate.auctionTotalBids++; // Increase number of bids for this auction
			auctionUpdate.numberOfBids = biddersNumberOfBids[bidderIndex].numberOfBids; // Store the number of bids for this bidder in the object that will be sent to the aucioneer

			io.in("bidders").emit("newHighestBid", bidInfo); // Send a message to the bidders with the new information

			io.to(aucioneerSocketId).emit("newUpdate", auctionUpdate); // Send a message to the auctioneer with the auction update
		}
	});
});

// Start the server
http.listen(3000, function () {
	console.log("listening on *:3000");
});
