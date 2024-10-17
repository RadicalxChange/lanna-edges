'use server'

import prisma from "@/db"
import { Account } from "@/types/account";
import { StagedTransaction, Transaction } from "@/types/transaction"
import { sendMail } from "./sendMail";

// helper function for calculating value creation stat
const calculateValueCreation = (transactions: Transaction[], data: StagedTransaction): number => {
  // Group transactions by sender_id and sum their amounts
  const senderSums: { [key: number]: number } = {};

  transactions.forEach((transaction) => {
    const { sender_id, amount } = transaction;
    senderSums[sender_id] = (senderSums[sender_id] || 0) + amount;
  });

  // Add the staged transaction in
  senderSums[data.sender_id] = (senderSums[data.sender_id] || 0) + data.amount;

  // Calculate rounded square roots and sum them
  let totalValueCreation = 0;

  for (const senderId in senderSums) {
    totalValueCreation += Math.round(Math.sqrt(senderSums[senderId]));
  }

  return totalValueCreation;
};

// TODO: handle errors
export async function createTransaction(data: StagedTransaction): Promise<Transaction> {

  let recipient: Account;

  if (data.recipient_account) {
    // If recipient account exists, first calculate new value_creation stat...
    const transactions: Transaction[] = await prisma.transaction.findMany({
      where: {
          recipient_id: data.recipient_account.id,
      }
    });

    const updatedValueCreation: number = calculateValueCreation(transactions, data)

    // ...then update recipient balance and value_creation.
    const updatedRecipient: Account = await prisma.account.update({
      where: { id: data.recipient_account.id },
      data: {
        balance: {
          increment: data.amount
        },
        value_creation: updatedValueCreation
      },
    });
    recipient = data.recipient_account
  } else {
    // if recipient account does not exist, create new non-member account
    const createdAccount: Account = await prisma.account.create({
      data: {
        name: data.recipient_name,
        email: data.recipient_email,
        balance: data.amount,
        value_creation: Math.round(Math.sqrt(data.amount)),
        is_member: false,
      }
    })
    recipient = createdAccount
  }

  if (data.is_taxable) {
    // Deposit any tax into the bank
    const bank: Account | null = await prisma.account.findFirst({
      where: {
        is_bank: true,
      }
    });
    if (bank) {
      const updatedBank: Account = await prisma.account.update({
        where: { id: bank.id },
        data: {
          balance: {
            increment: data.amount
          }
        },
      });
    }
  }

  // Subtract amount, plus any tax, from the sender balance
  const updatedSender: Account = await prisma.account.update({
    where: { id: data.sender_id },
    data: {
      balance: {
        decrement: data.amount * (data.is_taxable ? 2 : 1)
      }
    },
  });

  // Record the transaction
  const createdTransaction: Transaction = await prisma.transaction.create({
    data: {
      amount: data.amount,
      message: data.message,
      sender_id: data.sender_id,
      recipient_id: recipient.id,
      is_taxable: data.is_taxable
    }
  })

  // send email to recipient
  sendMail(recipient, data)

  return createdTransaction
}