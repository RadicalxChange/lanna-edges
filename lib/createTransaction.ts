'use server'

import prisma from "@/db"
import { Account } from "@/types/account";
import { StagedTransaction, Transaction } from "@/types/transaction"
import { sendMail } from "./sendMail";

// helper function for calculating value creation stat
const calculateValueAdded = (transactions: Transaction[], data: StagedTransaction): number => {
  // Sum the transactions from this sender to this recipient
  const prev_sum: number = transactions.reduce((acc, current) => acc + current.amount, 0)

  // Calculate how much the staged transaction changes the total value creation
  return Math.round(Math.sqrt(prev_sum + data.amount)) - Math.round(Math.sqrt(prev_sum));
};

// TODO: handle errors
export async function createTransaction(data: StagedTransaction): Promise<Transaction> {

  let recipient: Account;

  if (data.recipient_account) {
    // If recipient account exists, first calculate new value_creation stat...
    const transactions: Transaction[] = await prisma.transaction.findMany({
      where: {
          recipient_id: data.recipient_account.id,
          sender_id: data.sender_id,
      }
    });

    const valueAdded: number = calculateValueAdded(transactions, data)

    // ...then update recipient balance and value_creation.
    const updatedRecipient: Account = await prisma.account.update({
      where: { id: data.recipient_account.id },
      data: {
        balance: {
          increment: data.amount
        },
        value_creation: {
          increment: valueAdded
        },
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