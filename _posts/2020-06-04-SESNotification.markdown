---
layout: post
title:  "Using SES Custom Domain Verification"
date:   2020-06-01 13:36:54 -0400
categories: Technology, AWS
---



 *All opinions are my own and not those of my employer*

### Prerequisites:
* **Configure your custom domain in Route 53.** You can learn more about custom domains + AWS Route 53 [here](https://aws.amazon.com/getting-started/hands-on/get-a-domain/)
* You should see a Route 53 hosted zone in the Route 53 management console. We will be adding record sets to that hosted zone, so it needs to be created prior to Verification of the domain in SES.

### SES Configuration

**Verifying a single address vs an entire domain:** When you verify an entire domain you benefit by having *any* email address associated with that domain verified. For example `example1.<yourdomain>.com` and `example2.<yourdomain>.com` will both be verified, in comparison to having to verify each email address manually. [How to verify a domain with Amazon SES](https://docs.aws.amazon.com/ses/latest/DeveloperGuide/verify-domain-procedure.html)

**SES Domain Verification High-Level Steps**
* In the SES console navigate to the "Verified Domain List". Choose to verify a new domain, and type in the domain you want to verify.
* Optionally, select to generate DKIM settings. DKIM ([DomainKeys Identified Mail](https://docs.aws.amazon.com/ses/latest/DeveloperGuide/send-email-authentication-dkim.html)) is a standard that allows senders to sign their email messages with a cryptographic key. I highly recommend setting this up.
* Now you should see several record sets. 1 TXT record set to be used for the Domain Verification, and 2 CNAME records to be used for DKIM settings. In your domain provider (in my case a R53 hosted zone) add these new record sets. [Step 7](https://docs.aws.amazon.com/ses/latest/DeveloperGuide/verify-domain-procedure.html) in this document has more details on this.
* Verification can take up to 72 hours once the records are added to your domain provider.


