import { contactsModel } from '../db/models/contact.js';

export const getAllContacts = async () => {
  const contacts = await contactsModel.find();
  return contacts;
};

export const getContactsById = async (contactId) => {
  const contact = await contactsModel.findById(contactId);
  return contact;
};