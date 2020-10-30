terraform {
  backend "s3" {
    bucket = "aztec-terraform"
    key    = "aztec2/blockchain"
    region = "eu-west-2"
  }
}

variable "ROLLUP_CONTRACT_ADDRESS" {
  type = string
}

output "rollup_contract_address" {
  value = "${var.ROLLUP_CONTRACT_ADDRESS}"
}
