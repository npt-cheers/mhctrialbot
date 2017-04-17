/*-----------------------------------------------------------------------------
This template demonstrates how to use an IntentDialog with a LuisRecognizer to add 
natural language support to a bot. 
For a complete walkthrough of creating this type of bot see the article at
http://docs.botframework.com/builder/node/guides/understanding-natural-language/
-----------------------------------------------------------------------------*/
"use strict";
var builder = require("botbuilder");
var botbuilder_azure = require("botbuilder-azure");
//var Promise = require('bluebird');

var useEmulator = (process.env.NODE_ENV == 'development');

var connector = useEmulator ? new builder.ChatConnector() : new botbuilder_azure.BotServiceConnector({
    appId: process.env['MicrosoftAppId'],
    appPassword: process.env['MicrosoftAppPassword'],
    stateEndpoint: process.env['BotStateEndpoint'],
    openIdMetadata: process.env['BotOpenIdMetadata']
});

var bot = new builder.UniversalBot(connector);

// Make sure you add code to validate these fields
var luisAppId = process.env.LuisAppId;
var luisAPIKey = process.env.LuisAPIKey;
var luisAPIHostName = process.env.LuisAPIHostName || 'westus.api.cognitive.microsoft.com';

const LuisModelUrl = 'https://' + luisAPIHostName + '/luis/v1/application?id=' + luisAppId + '&subscription-key=' + luisAPIKey;

// Main dialog with LUIS
var recognizer = new builder.LuisRecognizer(LuisModelUrl);

var intents = new builder.IntentDialog({ recognizers: [recognizer] })

.matches('FindServiceProvider', [
        function(session, args, next) {
            session.send('Welcome to the Service Bot! we are analyzing your message: \'%s\'', session.message.text);

            // get the entities now
            var sProvider = builder.EntityRecognizer.findEntity(args.entities, 'ServiceProvider');
            var sLocation = builder.EntityRecognizer.findEntity(args.entities, 'builtin.geography.city');
            //var sZip = builder.EntityRecognizer.findEntity(args.entities, 'Zipcode');
            
            session.send ('Provider found : \'%s\'', sProvider.entity);
            session.send ('Location found : \'%s\'', sLocation.entity);
            
            if (sLocation) {
                // location detected. save and proceed
                session.dialogData.location = sLocation;
                session.dialogData.serviceprovider = sProvider;
                
                next ({ response: sLocation.entity });
            //} else if (sZip) {
                
            //    session.dialogData.zip = sZip;
            //    next ({ response: sZip.entity });
                
            } else {
                builder.Prompts.text(session, 'Please provide a location');
            }
        },
        function(session, results) {
            var location = results.response;

            session.send('I got location for location as \'%s\'', session.dialogData.location.entity);
            
            session.send('You are looking for \'%s\'', session.dialogData.serviceprovider.entity);
            
            var message = 'hello';
            
            searchServiceProviders(location)
            .then(function (serviceProviders) {
                // args
                session.send('I found %d hotels:', serviceProviders.length);

                var message = new builder.Message()
                    .attachmentLayout(builder.AttachmentLayout.carousel)
                    .attachments(serviceProviders.map(hotelAsAttachment));

                session.send(message);

                // End
                session.endDialog();
            });

        }
    ])
//... See details at http://docs.botframework.com/builder/node/guides/understanding-natural-language/

.onDefault((session) => {
    session.send('Sorry, I did not understand \'%s\'.', session.message.text);
});

bot.dialog('/', intents);    

if (useEmulator) {
    var restify = require('restify');
    var server = restify.createServer();
    server.listen(3978, function() {
        console.log('test bot endpont at http://localhost:3978/api/messages');
    });
    server.post('/api/messages', connector.listen());    
} else {
    module.exports = { default: connector.listen() }
}


var ReviewsOptions = [
    '“Very stylish, great stay, great staff”',
    '“good hotel awful meals”',
    '“Need more attention to little things”',
    '“Lovely small hotel ideally situated to explore the area.”',
    '“Positive surprise”',
    '“Beautiful suite and resort”'];

function searchServiceProvider (location) {
    return new Promise(function (resolve) {

        // Filling the hotels results manually just for demo purposes
        var serviceProviders = [];
        for (var i = 1; i <= 5; i++) {
            serviceProviders.push({
                name: location + ' Service Provider ' + i,
                location: location,
                rating: Math.ceil(Math.random() * 5),
                numberOfReviews: Math.floor(Math.random() * 5000) + 1,
                priceStarting: Math.floor(Math.random() * 450) + 80,
                image: 'https://placeholdit.imgix.net/~text?txtsize=35&txt=Provider+' + i + '&w=500&h=260'
            });
        }

        serviceProviders.sort(function (a, b) { return a.priceStarting - b.priceStarting; });

        // complete promise with a timer to simulate async response
        setTimeout(function () { resolve(serviceProviders); }, 1000);
    });
}

function searchHotelReviews  (hotelName) {
    return new Promise(function (resolve) {

        // Filling the review results manually just for demo purposes
        var reviews = [];
        for (var i = 0; i < 5; i++) {
            reviews.push({
                title: ReviewsOptions[Math.floor(Math.random() * ReviewsOptions.length)],
                text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mauris odio magna, sodales vel ligula sit amet, vulputate vehicula velit. Nulla quis consectetur neque, sed commodo metus.',
                image: 'https://upload.wikimedia.org/wikipedia/en/e/ee/Unknown-person.gif'
            });
        }

        // complete promise with a timer to simulate async response
        setTimeout(function () { resolve(reviews); }, 1000);
    });
}


// Helpers
function hotelAsAttachment(hotel) {
    return new builder.HeroCard()
        .title(hotel.name)
        .subtitle('%d stars. %d reviews. From $%d per night.', hotel.rating, hotel.numberOfReviews, hotel.priceStarting)
        .images([new builder.CardImage().url(hotel.image)])
        .buttons([
            new builder.CardAction()
                .title('More details')
                .type('openUrl')
                .value('https://www.bing.com/search?q=hotels+in+' + encodeURIComponent(hotel.location))
        ]);
}

function reviewAsAttachment(review) {
    return new builder.ThumbnailCard()
        .title(review.title)
        .text(review.text)
        .images([new builder.CardImage().url(review.image)]);
}
