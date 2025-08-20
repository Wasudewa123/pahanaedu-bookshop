package com.example.demo.service;

import com.example.demo.model.Customer;
import com.example.demo.repository.CustomerRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class CustomerService {

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    public Customer registerCustomer(Customer customer) {
        customer.setPassword(passwordEncoder.encode(customer.getPassword()));
        return customerRepository.save(customer);
    }

    public Optional<Customer> findByUsername(String username) {
        return customerRepository.findByUsername(username);
    }

    public List<Customer> getAllCustomers() {
        return customerRepository.findAll();
    }

    public Optional<Customer> findByAccountNumber(String accountNumber) {
        return customerRepository.findByAccountNumber(accountNumber);
    }

    public Customer updateCustomer(Customer customer) {
        return customerRepository.save(customer);
    }

    public Customer addCustomer(Customer customer) {
        return customerRepository.save(customer);
    }

    public Customer updateCustomerById(String id, String accountNumber, String name, String email, String phone, String address) {
        Optional<Customer> opt = customerRepository.findById(id);
        if (opt.isPresent()) {
            Customer customer = opt.get();
            if (accountNumber != null) customer.setAccountNumber(accountNumber);
            if (name != null) customer.setName(name);
            if (email != null) customer.setEmail(email);
            if (phone != null) customer.setPhone(phone);
            if (address != null) customer.setAddress(address);
            return customerRepository.save(customer);
        }
        throw new RuntimeException("Customer not found with ID: " + id);
    }

    public void deleteCustomer(String id) {
        Optional<Customer> opt = customerRepository.findById(id);
        if (opt.isPresent()) {
            customerRepository.deleteById(id);
        } else {
            throw new RuntimeException("Customer not found with ID: " + id);
        }
    }
}
