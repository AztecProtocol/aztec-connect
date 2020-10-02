# Infrastructure As Code

### Why Use It?

In todays world we use cloud computing to host hardware infrastructure, that previously would have required a company to buy, host in a server room, and maintain with a team of dev-ops engineers. Popular cloud computing platforms include AWS and Google Cloud. Infrastructure can also go beyond such providers into 3rd party services providing niche services such as Datadog for systems telemetry, Runscope for smoke testing services, Rollbar for tracking errors etc.

All of these services provide dashboards through web UI's for management. While this is a good starting point for small teams with small infrastructures, it quickly becomes unwieldily with multiple engineers. How does one keep track of what's been configured? How can we version changes? Can we speed up the process of configuration vs clicking around web UI's? Can we deploy changes as part of our CI pipeline? Is security at risk when you have dozens of engineers, and access management to maintain?

Infrastructure as code (iac) tools attempt to resolve the above, providing:

- Declarative code describing exactly what your infrastructure should look like.
- Version control as you can check changes into source control such as Github.
- Speed. Once the initial configuration hump is surpassed, changes can be as simple as one line modifications. Entire infrastructures can be launched with a one line command.
- Deployment commands can be run as part of your CI pipeline, allowing the services and infrastructure a service depends on, to be created and modified alongside the code changes that require them.
- Users can be quickly on-boarded and removed from the system with a few lines to grant (or revoke) access to many services easily.

### Iac Tools

We use Terraform, but there are a number of other iac tools on the market.

- Amazons Cloud Formation
- Googles Deployment Manager
- Ansible
- Chef
- Puppet
- ...and more

The main benefit of Terraform over Amazon and Google, is that it supports many dozens of so called "providers" around the web, whereas Cloud Formation only supports AWS etc. If you think you can survive in a single provider these tools suffice, but pragmatically that's rare. Ansible, Chef, Puppet etc are older than Terraform and are quite cumbersome to use. Terraform provides a modern, flexible approach to iac.

It's not without its flaws. Being a general purpose provider, it sometimes fails to handle certain situations gracefully. These can usually be fairly cleanly worked around.

### External Resources

- Official documentation. Lengthy, dry. Strap in.
  https://www.terraform.io/docs/configuration/index.html
- Quick key concepts. Reading time about 30m. Start here.
  https://www.terraform-best-practices.com/
