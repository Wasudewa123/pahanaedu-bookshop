package com.example.demo.repository;

import com.example.demo.model.Bill;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface BillRepository extends MongoRepository<Bill, String> {
    List<Bill> findByAccountNumberOrderByBillDateDesc(String accountNumber);
    List<Bill> findByStatus(String status);
    List<Bill> findByAccountNumber(String accountNumber);
    Optional<Bill> findByBillNumber(String billNumber);
} 