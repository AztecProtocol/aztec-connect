resource "aws_route53_zone" "main" {
  name = "${var.domain_name}"
  comment = "Managed by Terraform"

  tags {
    Environment = "production"
  }
}

resource "aws_route53_record" "main-a-record" {
   zone_id = "${aws_route53_zone.main.zone_id}"
   name = "${var.domain_name}"
   type = "A"
   alias {
    name = "${aws_s3_bucket.website.website_domain}"
    zone_id = "${aws_s3_bucket.website.hosted_zone_id}"
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "main-c-name" {
  zone_id = "${aws_route53_zone.main.zone_id}"
  name = "www"
  type = "CNAME"
  ttl = "300"
  records = ["${var.domain_name}"]
}