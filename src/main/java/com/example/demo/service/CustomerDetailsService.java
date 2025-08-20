package com.example.demo.service;

import com.example.demo.model.Customer;
import com.example.demo.model.Admin;
import com.example.demo.repository.CustomerRepository;
import com.example.demo.repository.AdminRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.Optional;

@Service
public class CustomerDetailsService implements UserDetailsService {
    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private AdminRepository adminRepository;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        // First try to find as admin
        Optional<Admin> admin = adminRepository.findByUsername(username);
        if (admin.isPresent()) {
            Admin a = admin.get();
            if (a.isActive()) {
                return new User(
                    a.getUsername(),
                    a.getPassword(),
                    Collections.singletonList(new SimpleGrantedAuthority("ROLE_ADMIN"))
                );
            }
        }
        
        // Then try to find as customer
        Optional<Customer> customer = customerRepository.findByUsername(username);
        if (customer.isPresent()) {
            Customer c = customer.get();
            return new User(
                c.getUsername(),
                c.getPassword(),
                Collections.singletonList(new SimpleGrantedAuthority("ROLE_CUSTOMER"))
            );
        }
        
        throw new UsernameNotFoundException("User not found: " + username);
    }
} 