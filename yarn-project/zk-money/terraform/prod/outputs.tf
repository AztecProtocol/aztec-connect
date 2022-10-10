output "cloudfront" {
  value = "${aws_cloudfront_distribution.zkmoney_distribution.id}"
}

output "cloudfront_domain_name" {
  value = "${aws_cloudfront_distribution.zkmoney_distribution.domain_name}"
}

output "hosted_zone_id" {
  value = "${aws_cloudfront_distribution.zkmoney_distribution.hosted_zone_id}"
}

output "s3" {
  value = "${aws_s3_bucket.zkmoney_bucket.bucket}"
}
