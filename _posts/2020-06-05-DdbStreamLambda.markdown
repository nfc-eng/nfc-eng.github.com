---
layout: post
title:  "Using AWS Dynamo DB Streams with AWS Lambda"
date:   2020-06-01 13:36:54 -0400
categories: Technology, AWS
---



 *All opinions are my own and not those of my employer*
 
 ### Introduction:
 
 This post is focused on using DynamoDb Streams as a notification mechanism to invoke AWS Lambda.
 
 Some common use-cases for using DynamoDb Streams include:
 * Triggering an event when a certain type of update occurs to the database
 * Notifying another service upon a certain type of event in the database
 * Updating an audit trail upon a specific type of event in the database
 
 [DDB Streams](https://docs.aws.amazon.com/amazonDynamoDb/latest/developerguide/Streams.html) are a mechanism designed to capture all of the above use-cases and more. From the AWS Docs: 
 > A DynamoDb stream is an ordered flow of information about changes to items in a DynamoDb table. When you enable a stream on a table, DynamoDb captures information about every modification to data items in the table. 
 
 
 ### DynamoDb Stream + Lambda Components
 When setting up an AWS lambda function to consume DynamoDb Stream events there are **4 primary components** that come to mind.  I have linked to the CloudFormation documentation for each of the resources. We have:
 
 [**DynamoDb Table**](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-dynamodb-table.html): The table that we are listening to for updates or changes.
 
 [**DynamoDb Stream**](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-dynamodb-table.html#cfn-dynamodb-table-streamspecification): Think of this as the event bus that notifications travel along when an event is detected against the DynamoDb Table.
 
 [**Lambda Event Source Mapping**](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-lambda-eventsourcemapping.html#cfn-lambda-eventsourcemapping-maximumretryattempts): This is the component that tells the Lambda Function what event source to monitor and consume from. Without this association the Lambda Function will never be invoked by the events flowing on the DynamoDb Stream.
 
 [**Lambda Function**](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-lambda-function.html): This is the function that will be invoked whenever a new event is detected on the DynamoDb Stream. This is the compute resource that allows us to insert custom logic when invoked.
 
 
 To be clear, the flow of data is ->DynamoDbTable -> DynamoDbStream -> LambdaFunction
 

### Exception Handling

AWS Lambda has default exception/retry behavior configured when consuming from different queue/stream/notification systems. You can become more familiar with Lambda's general retry strategy via the [Lambda error handling documentation](https://docs.aws.amazon.com/lambda/latest/dg/invocation-retries.html). Lambda extends that same strategy for retries to DynamoDb Streams.

Checkout the official AWS docs for error handling in [AWS Lambda with DynamoDb](https://docs.aws.amazon.com/lambda/latest/dg/with-ddb.html#services-DynamoDb-errors), my summary is below.

There are **two primary** components that can be adjusted to increase/decrease the aggressiveness of retries when it comes to Lambda and DynamoDb Streams. From the AWS documentation when describing DynamoDb + Lambda exception handling: 
> ... Lambda retries until the records expire or exceed the maximum age that you configure on the event source mapping. 

Therefore, we can increase our maximum number of retries, or increase the maximum age of the record. These changes will take place on our Lambda Event Source Mapping, described above in the Components section. See [MaximumRetryAttempts](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-lambda-eventsourcemapping.html#cfn-lambda-eventsourcemapping-maximumretryattempts) and [MaximumRecordAgeInSeconds](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-lambda-eventsourcemapping.html#cfn-lambda-eventsourcemapping-maximumrecordageinseconds)


**Beware an over-aggressive retry strategy.** If your service has a single record that cannot be processed, and your MaximumRecordAgeInSeconds is too large, you can block consumption of events on that shard of your DynamoDb Stream for days. This leaves your service highly susceptible to [poison-pill](https://aws.amazon.com/message-queue/features/) scenarios (although that would entail a poison pill being written to your Db, which wouldn't be great).

**Configure a failed-event destination.** In the case of an event being unprocessable by Lambda, you can configure a failed-event destination.  Common mechanisms in this case are SNS Topics or SQS Queues (Frequently called Dead Letter Queues). In this case you can dive deeper into the record that was unprocessable and hopefully root cause the issue that occurred in your Lambda function.
