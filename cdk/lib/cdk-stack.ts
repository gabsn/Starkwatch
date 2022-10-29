import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as path from "path";
import { Duration, RemovalPolicy } from "aws-cdk-lib";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { AttributeType, BillingMode, Table } from "aws-cdk-lib/aws-dynamodb";

export class CdkStack extends cdk.Stack {
  table: cdk.aws_dynamodb.Table;
  fetchLambda: cdk.aws_lambda_nodejs.NodejsFunction;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.setupTable();
    this.setupFetcher();
    this.table.grantFullAccess(this.fetchLambda);
  }

  setupTable() {
    this.table = new Table(this, "TransactionStatus", {
      partitionKey: {
        name: "transactionHash",
        type: AttributeType.STRING,
      },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.RETAIN,
    });
  }

  setupFetcher() {
    this.fetchLambda = new NodejsFunction(this, "Fetcher", {
      timeout: Duration.seconds(40),
      memorySize: 256,
      entry: path.resolve(__dirname, "../functions/fetcher.ts"),
      runtime: Runtime.NODEJS_16_X,
      logRetention: RetentionDays.ONE_WEEK,
      bundling: {
        minify: true,
        externalModules: ["aws-sdk"],
      },
    });
    const eventRule = new events.Rule(this, "scheduleRule", {
      schedule: events.Schedule.rate(Duration.minutes(1)),
    });
    eventRule.addTarget(new targets.LambdaFunction(this.fetchLambda));
  }
}
