terraform {
  backend "s3" {
    bucket = "aztec-terraform"
    region = "eu-west-2"
  }
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "3.74.2"
    }
  }
}

variable "ROLLUP_CONTRACT_ADDRESS" {
  type    = string
  default = ""
}

output "rollup_contract_address" {
  value = "${var.ROLLUP_CONTRACT_ADDRESS}"
}

variable "PERMIT_HELPER_CONTRACT_ADDRESS" {
  type    = string
  default = ""
}

output "permit_helper_contract_address" {
  value = "${var.PERMIT_HELPER_CONTRACT_ADDRESS}"
}

variable "FAUCET_CONTRACT_ADDRESS" {
  type    = string
  default = ""
}

output "faucet_contract_address" {
  value = "${var.FAUCET_CONTRACT_ADDRESS}"
}

variable "FEE_DISTRIBUTOR_ADDRESS" {
  type    = string
  default = ""
}

output "fee_distributor_address" {
  value = "${var.FEE_DISTRIBUTOR_ADDRESS}"
}

variable "BRIDGE_DATA_PROVIDER_CONTRACT_ADDRESS" {
  type    = string
  default = ""
}

output "bridge_data_provider_contract_address" {
  value = "${var.BRIDGE_DATA_PROVIDER_CONTRACT_ADDRESS}"
}

variable "PRICE_FEED_CONTRACT_ADDRESSES" {
  type    = string
  default = ""
}

output "price_feed_contract_addresses" {
  value = "${var.PRICE_FEED_CONTRACT_ADDRESSES}"
}

